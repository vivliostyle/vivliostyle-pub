"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalIO = exports.GitHubIO = exports.DummyFs = exports.GitHubFs = void 0;
var fetch_github_content_1 = __importDefault(require("fetch-github-content"));
/**
 * GitHubの特定のリポジトリを読み書きする
 */
var GitHubFs = /** @class */ (function () {
    /**
     * コンストラクタ
     */
    function GitHubFs(p) {
        var _this = this;
        var _a;
        this.readdir = function (path, options) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, []];
        }); }); };
        if (p.ownerOrUrl && p.repo) {
            // ownerやrepoが渡された
            this.owner = p.ownerOrUrl;
            this.repo = p.repo;
        }
        else {
            // URLが渡された場合
            var path = GitHubFs.parseURL(p.ownerOrUrl);
            this.owner = path.owner;
            this.repo = path.repo;
        }
        this.dir = (_a = p.dir) !== null && _a !== void 0 ? _a : '';
        this.token = p.octkitOrToken;
    }
    /**
     * urlからowner, repo, pathを取り出す
     * @param url
     * @returns
     */
    GitHubFs.parseURL = function (url) {
        var found = url.match(/https:\/\/github\.com\/([\w-\.]+)\/([\w-\.]+).git(?:\/(.*))?/);
        if (found == null || !found[1] || !found[2]) {
            throw new Error('invalid github url : ' + url);
        }
        var path = { owner: found[1], repo: found[2], path: found[3] };
        return path;
    };
    GitHubFs.prototype.readFile = function (path, json) {
        return __awaiter(this, void 0, void 0, function () {
            var content;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, fetch_github_content_1.default)({
                            owner: this.owner,
                            repo: this.repo,
                            path: path,
                            token: this.token,
                            json: json,
                        })];
                    case 1:
                        content = _a.sent();
                        return [2 /*return*/, content];
                }
            });
        });
    };
    GitHubFs.prototype.writeFile = function () {
        return __awaiter(this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/];
        }); });
    };
    return GitHubFs;
}());
exports.GitHubFs = GitHubFs;
/**
 * テスト用のファイルシステム
 */
var DummyFs = /** @class */ (function () {
    function DummyFs() {
        var _this = this;
        this.readdir = function (path, options) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, []];
        }); }); };
    }
    DummyFs.open = function () {
        return new DummyFs();
    };
    DummyFs.prototype.readFile = function (path) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, path];
            });
        });
    };
    DummyFs.prototype.writeFile = function () {
        return __awaiter(this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/];
        }); });
    };
    return DummyFs;
}());
exports.DummyFs = DummyFs;
/**
 * テーマの本体がGitHubにある
 */
var GitHubIO = /** @class */ (function () {
    /**
     * コンストラクタ
     * @param token GitHubAccessToken
     */
    function GitHubIO(owner, repo, token) {
        if (token === void 0) { token = null; }
        this.owner = owner;
        this.repo = repo;
        this.token = token;
    }
    /**
     *
     * @param path
     * @param data
     */
    GitHubIO.prototype.put = function (path, data) {
        throw new Error('Method not implemented.');
    };
    /**
     * TODO: 全ファイル名の取得
     */
    GitHubIO.prototype.findAll = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, []];
            });
        });
    };
    GitHubIO.parseURL = function (url) {
        var found = url.match(/https:\/\/github\.com\/([\w-\.]+)\/([\w-\.]+).git(?:\/(.*))?/);
        if (found == null || !found[1] || !found[2]) {
            throw new Error('invalid github url : ' + url);
        }
        var path = { owner: found[1], repo: found[2], path: found[3] };
        return path;
    };
    /**
     * ファイルを取得
     * @param path 取得するファイルのパス(owner/repo/以下)
     * @param json JSONオブジェクトとして取得するならtrue
     * @returns
     */
    GitHubIO.prototype.get = function (path, json) {
        if (json === void 0) { json = false; }
        return __awaiter(this, void 0, void 0, function () {
            var content;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, fetch_github_content_1.default)({
                            owner: this.owner,
                            repo: this.repo,
                            path: path,
                            token: this.token,
                            json: json,
                        })];
                    case 1:
                        content = _a.sent();
                        return [2 /*return*/, content];
                }
            });
        });
    };
    return GitHubIO;
}());
exports.GitHubIO = GitHubIO;
/**
 * ローカルファイルの入出力
 */
var LocalIO = /** @class */ (function () {
    function LocalIO() {
    }
    LocalIO.prototype.get = function (path) {
        throw new Error('Method not implemented.');
    };
    LocalIO.prototype.put = function (path, data) {
        throw new Error('Method not implemented.');
    };
    return LocalIO;
}());
exports.LocalIO = LocalIO;
