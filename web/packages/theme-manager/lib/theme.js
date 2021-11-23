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
exports.SingleFileTheme = exports.PackageTheme = void 0;
var upath_1 = __importDefault(require("upath"));
/**
 * nodeパッケージ型のテーマ
 * package.jsonがルートディレクトリに存在する
 */
var PackageTheme = /** @class */ (function () {
    function PackageTheme(fs, packageName) {
        var _a, _b, _c;
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
        this.fs = fs;
        this.name = packageName;
        var repo_dir = '';
        var pkgJson = this.getPackageJson(repo_dir);
        // console.log(pkgJson);
        this.name = packageName;
        this.description = pkgJson.description;
        this.version = pkgJson.version;
        this.author = pkgJson.author;
        if (pkgJson.vivliostyle) {
            if (pkgJson.vivliostyle.theme) {
                var t = pkgJson.vivliostyle.theme;
                this.category = (_a = t.category) !== null && _a !== void 0 ? _a : "";
                this.topics = (_b = t.topics) !== null && _b !== void 0 ? _b : [];
                this.style = upath_1.default.normalize((_c = t.style) !== null && _c !== void 0 ? _c : "");
            }
        }
    }
    PackageTheme.prototype.getStylePath = function () {
        return null;
    };
    /**
     * テーマに含まれるファイルを取得する
     */
    PackageTheme.prototype.fetch = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/];
            });
        });
    };
    PackageTheme.fetch = function (packageName) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // //TODO: とりあえずGitHubに本体のあるパッケージの場合.他のケースはあとで
                // const pkgName = encodeURIComponent(packageName);
                // const results = await NpmApi.getPackage(pkgName);
                // const repository = results.collected.metadata.repository;
                // if (!repository) {
                //   throw new Error("GitHub repository not found : " + pkgName);
                // }
                // // GitHubにアクセスするためのIOクラス
                // const path = GitHubIO.parseURL(repository.url);
                // const io = new GitHubIO(path.owner, path.repo, GitHubAccessToken);
                // const filenames = await io.findAll();
                // const pkgJson = (await PackageTheme.getPackageJson(
                //   repository.directory,
                //   io
                // )) as unknown as {
                //   name: string;
                //   description: string;
                //   version: string;
                //   author: string;
                //   vivliostyle: {
                //     theme: {
                //       category?: string;
                //       topics?: string[];
                //       style?: string;
                //     };
                //   };
                // };
                // const theme = new PackageTheme();
                // // console.log(pkgJson);
                // theme.name = packageName;
                // theme.description = pkgJson.description;
                // theme.version = pkgJson.version;
                // theme.author = pkgJson.author;
                // if (pkgJson.vivliostyle) {
                //   if (pkgJson.vivliostyle.theme) {
                //     const t = pkgJson.vivliostyle.theme;
                //     theme.category = t.category ?? "";
                //     theme.topics = t.topics ?? [];
                //     theme.style = upath.normalize(t.style ?? "");
                //   }
                // }
                // if (theme.style) {
                //   try {
                //     const data = await io.get(
                //       upath.join(repository.directory, theme.style)
                //     );
                //     theme.files[theme.style] = data;
                //   } catch (error) {
                //     throw new Error("style file access error");
                //   }
                // }
                // return theme;
                return [2 /*return*/, null];
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
            return __generator(this, function (_a) {
                // try {
                //   const packageTheme = await PackageTheme.fetch(packageName);
                //   return packageTheme;
                // } catch (e) {
                //   if ((e as Error).message.includes("API rate limit")) {
                //     throw new Error("認証せずにGitHub APIを使えるのは、60件/時まで");
                //   } else {
                //     throw e;
                //   }
                // }
                return [2 /*return*/, null];
            });
        });
    };
    PackageTheme.prototype.getPackageJson = function (repo_directory) {
        return __awaiter(this, void 0, void 0, function () {
            var path, pkg_json;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        path = (repo_directory !== null && repo_directory !== void 0 ? repo_directory : "") + "/package.json";
                        return [4 /*yield*/, this.fs.readFile(path, true)];
                    case 1:
                        pkg_json = _a.sent();
                        return [2 /*return*/, pkg_json];
                }
            });
        });
    };
    return PackageTheme;
}());
exports.PackageTheme = PackageTheme;
/**
 * CSSファイル単体のテーマ
 * http
 * local
 * TODO: nodeパッケージはありえないか
 */
var SingleFileTheme = /** @class */ (function () {
    function SingleFileTheme(fs, packageName) {
        this.name = "";
        this.topics = [];
        this.files = {};
        this.fs = fs;
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
    SingleFileTheme.prototype.getStylePath = function () {
        return null;
    };
    return SingleFileTheme;
}());
exports.SingleFileTheme = SingleFileTheme;
