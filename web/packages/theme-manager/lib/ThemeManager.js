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
exports.PackageTheme = exports.SingleFileTheme = void 0;
var npm_api_js_1 = __importDefault(require("npm-api.js")); // npm-apiとnpm-api.jsという別のパッケージがあるので注意
var srcIO_1 = require("./srcIO");
var upath_1 = __importDefault(require("upath"));
var GitHubAccessToken;
/**
 * CSSファイル単体のテーマ
 * http
 * local
 * TODO: nodeパッケージはありえないか
 */
var SingleFileTheme = /** @class */ (function () {
    function SingleFileTheme(packageName) {
        this.name = "";
        this.topics = [];
        this.files = {};
        // HTTPかローカルか
        if (packageName.match(/^https?:/)) {
            // HTTP
            // this.srcIO = new HttpIO();
        }
        else {
            // ローカル
            // this.srcIO = new localIO();
        }
        this.name = packageName;
        this.style = packageName;
        // TODO: コメントから取得
        this.category = "";
    }
    return SingleFileTheme;
}());
exports.SingleFileTheme = SingleFileTheme;
/**
 * nodeパッケージ型のテーマ
 * package.jsonがルートディレクトリに存在する
 */
var PackageTheme = /** @class */ (function () {
    function PackageTheme() {
        this.name = "";
        this.author = "";
        this.date = "";
        this.description = "";
        this.keywords = [];
        this.links = {};
        this.maintainers = [];
        this.publisher = { username: "", email: "" };
        this.scope = "";
        this.version = "";
        // from package.json
        this.category = "";
        this.style = "";
        this.topics = [];
        this.files = {};
    }
    PackageTheme.fetch = function (packageName) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function () {
            var pkgName, results, repository, path, io, filenames, pkgJson, theme, t, data, error_1;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        pkgName = encodeURIComponent(packageName);
                        return [4 /*yield*/, npm_api_js_1.default.getPackage(pkgName)];
                    case 1:
                        results = _d.sent();
                        repository = results.collected.metadata.repository;
                        if (!repository) {
                            throw new Error("GitHub repository not found : " + pkgName);
                        }
                        path = srcIO_1.GitHubIO.parseURL(repository.url);
                        io = new srcIO_1.GitHubIO(path.owner, path.repo, GitHubAccessToken);
                        return [4 /*yield*/, io.findAll()];
                    case 2:
                        filenames = _d.sent();
                        return [4 /*yield*/, PackageTheme.getPackageJson(repository.directory, io)];
                    case 3:
                        pkgJson = (_d.sent());
                        theme = new PackageTheme();
                        // console.log(pkgJson);
                        theme.name = packageName;
                        theme.description = pkgJson.description;
                        theme.version = pkgJson.version;
                        theme.author = pkgJson.author;
                        if (pkgJson.vivliostyle) {
                            if (pkgJson.vivliostyle.theme) {
                                t = pkgJson.vivliostyle.theme;
                                theme.category = (_a = t.category) !== null && _a !== void 0 ? _a : "";
                                theme.topics = (_b = t.topics) !== null && _b !== void 0 ? _b : [];
                                theme.style = upath_1.default.normalize((_c = t.style) !== null && _c !== void 0 ? _c : "");
                            }
                        }
                        if (!theme.style) return [3 /*break*/, 7];
                        _d.label = 4;
                    case 4:
                        _d.trys.push([4, 6, , 7]);
                        return [4 /*yield*/, io.get(upath_1.default.join(repository.directory, theme.style))];
                    case 5:
                        data = _d.sent();
                        theme.files[theme.style] = data;
                        return [3 /*break*/, 7];
                    case 6:
                        error_1 = _d.sent();
                        throw new Error("style file access error");
                    case 7: return [2 /*return*/, theme];
                }
            });
        });
    };
    /**
     * npm-api.jsの結果からPackageThemeオブジェクトを生成
     * @param packageName
     * @returns PackageThemeオブジェクトまたはundefined
     */
    PackageTheme.fromNpm = function (packageName) {
        return __awaiter(this, void 0, void 0, function () {
            var packageTheme, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, PackageTheme.fetch(packageName)];
                    case 1:
                        packageTheme = _a.sent();
                        return [2 /*return*/, packageTheme];
                    case 2:
                        e_1 = _a.sent();
                        if (e_1.message.includes("API rate limit")) {
                            throw new Error("認証せずにGitHub APIを使えるのは、60件/時まで");
                        }
                        else {
                            throw e_1;
                        }
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    PackageTheme.getPackageJson = function (repo_directory, io) {
        return __awaiter(this, void 0, void 0, function () {
            var path, pkg_json, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        path = (repo_directory !== null && repo_directory !== void 0 ? repo_directory : "") + "/package.json";
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, io.get(path, true)];
                    case 2:
                        pkg_json = _a.sent();
                        return [2 /*return*/, pkg_json];
                    case 3:
                        error_2 = _a.sent();
                        console.error(error_2, "file read error:", path);
                        return [2 /*return*/, null];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return PackageTheme;
}());
exports.PackageTheme = PackageTheme;
/**
 *
 */
var ThemeManager = /** @class */ (function () {
    /**
     * コンストラクタ
     * @param token GitHubAccessToken
     */
    function ThemeManager(token) {
        if (token === void 0) { token = null; }
        this.themes = [];
        this.serchQuery = "keywords:vivliostyle-theme";
        GitHubAccessToken = token;
    }
    /**
     * NPMで公開されているテーマの一覧を取得
     * @param query
     * @param max 最大取得件数
     * @returns
     */
    ThemeManager.prototype.searchFromNpm = function (query, max) {
        if (query === void 0) { query = this.serchQuery; }
        if (max === void 0) { max = 100; }
        return __awaiter(this, void 0, void 0, function () {
            var results, promises, themes, error_3;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, npm_api_js_1.default.SearchPackage(query, max)];
                    case 1:
                        results = _a.sent();
                        // console.log(results);
                        if (!results) {
                            return [2 /*return*/, []];
                        }
                        promises = results.map(function (result) { return __awaiter(_this, void 0, void 0, function () {
                            var theme, error_4;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, PackageTheme.fromNpm(result.package.name)];
                                    case 1:
                                        theme = _a.sent();
                                        return [2 /*return*/, theme];
                                    case 2:
                                        error_4 = _a.sent();
                                        return [2 /*return*/, null];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        }); });
                        return [4 /*yield*/, Promise.all(promises)];
                    case 2:
                        themes = (_a.sent()).filter(function (v) { return v; });
                        this.themes = themes;
                        return [2 /*return*/, this.themes];
                    case 3:
                        error_3 = _a.sent();
                        console.error(error_3);
                        return [2 /*return*/, []];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    ThemeManager.prototype.getPackageFromNpm = function (themeName) {
        return __awaiter(this, void 0, void 0, function () {
            var results, theme;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, npm_api_js_1.default.SearchPackage(themeName, 1)];
                    case 1:
                        results = _a.sent();
                        if (results.length != 1) {
                            throw new Error("theme not found");
                        }
                        return [4 /*yield*/, PackageTheme.fromNpm(results[0].package.name)];
                    case 2:
                        theme = _a.sent();
                        if (theme != null) {
                            return [2 /*return*/, theme];
                        }
                        else {
                            throw new Error("theme not found");
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * テーマを取得する
     * @param themeName テーマ名 または URL
     * @returns themeインターフェースを実装するオブジェクト
     */
    ThemeManager.prototype.getTheme = function (themeName) {
        return __awaiter(this, void 0, void 0, function () {
            var theme;
            return __generator(this, function (_a) {
                theme = this.getPackageFromNpm(themeName);
                return [2 /*return*/, theme];
            });
        });
    };
    return ThemeManager;
}());
exports.default = ThemeManager;
