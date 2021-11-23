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
var npm_api_js_1 = __importDefault(require("npm-api.js")); // npm-apiとnpm-api.jsという別のパッケージがあるので注意
var theme_1 = require("./theme");
var GitHubAccessToken;
/**
 *
 */
var ThemeManager = /** @class */ (function () {
    /**
     * コンストラクタ
     * @param token GitHubAccessToken
     */
    function ThemeManager(config) {
        if (config === void 0) { config = null; }
        this.themes = [];
        this.serchQuery = "keywords:vivliostyle-theme";
        if (config === null || config === void 0 ? void 0 : config.GitHubAccessToken) {
            GitHubAccessToken = config.GitHubAccessToken;
        }
    }
    /**
     * npmのパッケージ名からGitHubへのアクセスオブジェクトを生成する
     * @param packageName
     * @returns
     */
    ThemeManager.prototype.npmToFs = function (packageName) {
        return __awaiter(this, void 0, void 0, function () {
            var pkgName, result, repository;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        pkgName = encodeURIComponent(packageName);
                        return [4 /*yield*/, npm_api_js_1.default.getPackage(pkgName)];
                    case 1:
                        result = _a.sent();
                        repository = result.collected.metadata.repository;
                        if (repository) {
                            if (repository.type === "git") {
                                return [2 /*return*/, null];
                                // new GitHubFs({
                                //   octkitOrToken:GitHubAccessToken!, 
                                //   ownerOrUrl:repository.url
                                // });    
                            }
                        }
                        else {
                            console.error('not Git : ', result.collected.metadata.name, '\n', result.collected.npm, '\n', result.collected.source);
                        }
                        throw new Error("GitHub repository not found : " + pkgName);
                }
            });
        });
    };
    /**
     * npmで公開されているテーマの一覧を取得
     * @param query
     * @param max 最大取得件数
     * @returns
     */
    ThemeManager.prototype.searchFromNpm = function (query, max) {
        if (query === void 0) { query = this.serchQuery; }
        if (max === void 0) { max = 100; }
        return __awaiter(this, void 0, void 0, function () {
            var results, promises, themes, error_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [2 /*return*/, []];
                    case 1:
                        _a.trys.push([1, 4, , 5]);
                        return [4 /*yield*/, npm_api_js_1.default.SearchPackage(query, max)];
                    case 2:
                        results = _a.sent();
                        // [
                        //   {
                        //     package: {
                        //       name: '@vivliostyle/theme-bunko',
                        //       scope: 'vivliostyle',
                        //       version: '0.5.0',
                        //       description: '文庫用のテーマ',
                        //       keywords: [Array],
                        //       date: '2021-11-07T11:47:24.147Z',
                        //       links: [Object],
                        //       author: [Object],
                        //       publisher: [Object],
                        //       maintainers: [Array]
                        //     },
                        //     flags: { unstable: true },
                        //     score: { final: 0.5837110266096406, detail: [Object] },
                        //     searchScore: 0.00008372865
                        //   },
                        // ]
                        // console.log(results);
                        // 検索結果が得られなければ例外を投げる
                        if (!results) {
                            throw new Error('npm access error');
                        }
                        promises = results.map(function (result) { return __awaiter(_this, void 0, void 0, function () {
                            var fs, theme, error_2;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 2, , 3]);
                                        return [4 /*yield*/, this.npmToFs(result.package.name)];
                                    case 1:
                                        fs = _a.sent();
                                        theme = new theme_1.PackageTheme(fs, result.package.name);
                                        return [2 /*return*/, theme];
                                    case 2:
                                        error_2 = _a.sent();
                                        console.error(error_2);
                                        return [2 /*return*/, null];
                                    case 3: return [2 /*return*/];
                                }
                            });
                        }); });
                        return [4 /*yield*/, Promise.all(promises)];
                    case 3:
                        themes = (_a.sent()).filter(function (v) { return v; });
                        this.themes = themes; // メモ化
                        return [2 /*return*/, this.themes];
                    case 4:
                        error_1 = _a.sent();
                        console.error(error_1);
                        return [2 /*return*/, []];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     *
     * @param themeName
     * @returns
     */
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
                        return [4 /*yield*/, theme_1.PackageTheme.fromNpm(results[0].package.name)];
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
