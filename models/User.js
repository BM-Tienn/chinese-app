const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    displayName: {
        type: String,
        default: ''
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date,
        default: Date.now
    },
    loginCount: {
        type: Number,
        default: 1
    },
    preferences: {
        language: {
            type: String,
            default: 'vi'
        },
        theme: {
            type: String,
            default: 'light'
        }
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true,
    collection: 'users'
});

// Index để tối ưu truy vấn
userSchema.index({ email: 1 });
userSchema.index({ isActive: 1, lastLogin: -1 });

// Method để cập nhật thông tin đăng nhập
userSchema.methods.updateLoginInfo = function () {
    this.lastLogin = new Date();
    this.loginCount += 1;
    return this.save();
};

// Static method để tìm hoặc tạo user
userSchema.statics.findOrCreate = async function (email, displayName = '') {
    let user = await this.findOne({ email });

    if (!user) {
        user = new this({
            email,
            displayName,
            lastLogin: new Date()
        });
        await user.save();
    } else {
        await user.updateLoginInfo();
    }

    return user;
};

module.exports = mongoose.model('User', userSchema);
