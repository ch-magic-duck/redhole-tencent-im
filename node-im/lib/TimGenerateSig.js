var crypto = require('crypto');
var zlib = require('zlib');
var fs = require('fs');
var path = require('path');

var base64url = {};

base64url.unescape = function(str) {
    return (str + Array(5 - str.length % 4)).replace(/_/g, '=').replace(/\-/g, '/').replace(/\*/g, '+');
};

base64url.escape = function(str) {
    return str.replace(/\+/g, '*').replace(/\//g, '-').replace(/=/g, '_');
};

base64url.encode = function(str) {
    return this.escape(new Buffer(str).toString('base64'));
};

base64url.decode = function(str) {
    return new Buffer(this.unescape(str), 'base64').toString();
};

var Sig = function(config) {
    this.sdkAppid = config.sdkAppid;
    this.accountType = config.accountType;
    this.identifier = config.identifier;
    this.appidAt3rd = config.sdkAppid;
    this.expireAfter = (config.expireAfter || 30 * 24 * 3600).toString();
    this.expireUntil = parseInt(Date.now() / 1000) + parseInt(this.expireAfter);
    this.privateKey = fs.readFileSync(path.join(__dirname, config.privateKey)).toString();
};

Sig.prototype._genSignContent = function(obj) {
    var ret = '';
    for (var i in obj) {
        ret += i + ':' + obj[i] + '\n';
    }
    return ret;
};

Sig.prototype.genSig = function(evalSig, callback) {
    var obj = {
        'TLS.appid_at_3rd': this.appidAt3rd,
        'TLS.account_type': this.accountType,
        'TLS.identifier': this.identifier,
        'TLS.sdk_appid': this.sdkAppid,
        'TLS.time': (Math.floor(Date.now() / 1000)).toString(),
        'TLS.expire_after': this.expireAfter
    };
    var content = this._genSignContent(obj);
    try {
        var signer = crypto.createSign('sha256');
        signer.update(content, 'utf8');
        var usrsig = signer.sign(this.privateKey, 'base64');
    } catch(err) {
        callback(err);
        return;
    }
    obj['TLS.sig'] = usrsig;
    var text = JSON.stringify(obj);
    var compressed = zlib.deflateSync(new Buffer(text)).toString('base64');
    evalSig(base64url.escape(compressed), this.expireUntil);
    if (callback) {
        callback();
    }
};

module.exports = Sig;