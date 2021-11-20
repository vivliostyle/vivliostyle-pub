"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
var fs_1 = __importDefault(require("fs"));
var path = __importStar(require("upath"));
var _1 = require(".");
var srcIO_1 = require("./srcIO");
var ThemeManager_1 = __importStar(require("./ThemeManager"));
var npm_api_js_1 = __importDefault(require("npm-api.js")); // npm-apiとnpm-api.jsという別のパッケージがあるので注意
// GitHubAccessTokenなしだとAPIを叩けるのが60回/h
// ひとつのパッケージごとに1アクセスするのですぐに限度が来るので注意
// https://docs.github.com/ja/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token
//const GitHubAccessToken: string | null = null;
var GitHubAccessToken = "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";
test("GitHub I/O parseURL", function () { return __awaiter(void 0, void 0, void 0, function () {
    var component, component2;
    return __generator(this, function (_a) {
        component = srcIO_1.GitHubIO.parseURL("git+https://github.com/vivliostyle/themes.git/package.json");
        expect(component.owner).toBe("vivliostyle");
        expect(component.repo).toBe("themes");
        expect(component.path).toBe("package.json");
        component2 = srcIO_1.GitHubIO.parseURL("git+https://github.com/vivliostyle/themes.git");
        expect(component2.owner).toBe("vivliostyle");
        expect(component2.repo).toBe("themes");
        expect(component2.path).toBe(undefined);
        return [2 /*return*/];
    });
}); });
/**
 * 全ファイル取得(未完成)
 */
test.skip("GitHub I/O findAll", function () { return __awaiter(void 0, void 0, void 0, function () {
    var io, filenames;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                io = new srcIO_1.GitHubIO('vivliostyle', 'themes', GitHubAccessToken);
                return [4 /*yield*/, io.findAll()];
            case 1:
                filenames = _a.sent();
                expect(filenames).toStrictEqual([]);
                return [2 /*return*/];
        }
    });
}); });
test("PackageTheme.getPackageJson method", function () { return __awaiter(void 0, void 0, void 0, function () {
    var io, path, pkgJson;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                io = new srcIO_1.GitHubIO("vivliostyle", "themes", GitHubAccessToken);
                path = "packages/@vivliostyle/theme-bunko";
                return [4 /*yield*/, _1.PackageTheme.getPackageJson(path, io)];
            case 1:
                pkgJson = (_a.sent());
                expect(pkgJson).toStrictEqual({
                    author: "Vivliostyle <mail@vivliostyle.org>",
                    description: "文庫用のテーマ",
                    devDependencies: {
                        "@vivliostyle/cli": "^4.3.2",
                        "npm-run-all": "^4.1.5",
                        sass: "^1.32.8",
                        "vivliostyle-theme-scripts": "^0.3.4",
                    },
                    files: ["*.css", "*.css.map", "scss", "example", "vivliostyle.config.js"],
                    homepage: "https://github.com/vivliostyle/themes",
                    keywords: ["vivliostyle", "vivliostyle-theme"],
                    license: "CC0-1.0",
                    name: "@vivliostyle/theme-bunko",
                    publishConfig: {
                        access: "public",
                    },
                    repository: {
                        directory: "packages/@vivliostyle/theme-bunko",
                        type: "git",
                        url: "https://github.com/vivliostyle/themes.git",
                    },
                    scripts: {
                        build: "run-p build:scss build:vivliostyle",
                        "build:scss": "sass scss:.",
                        "build:vivliostyle": "vivliostyle build",
                        dev: "run-p preview watch:scss",
                        preview: "vivliostyle preview",
                        validate: "vivliostyle-theme-scripts validate",
                        "watch:scss": "sass --watch scss:.",
                    },
                    version: "0.5.0",
                    vivliostyle: {
                        theme: {
                            category: "novel",
                            name: "Bunko",
                            style: "./theme_common.css",
                            topics: ["小説", "縦書き"],
                        },
                    },
                });
                return [2 /*return*/];
        }
    });
}); });
/*
 * NpmApiの仕様確認
 */
test.skip("NpmApi.getPackage", function () { return __awaiter(void 0, void 0, void 0, function () {
    var packageName, pkgName, results;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                packageName = "@vivliostyle/theme-bunko";
                pkgName = encodeURIComponent(packageName);
                return [4 /*yield*/, npm_api_js_1.default.getPackage(pkgName)];
            case 1:
                results = _a.sent();
                expect(results).not.toBeNull();
                expect(results.collected.metadata.repository).toStrictEqual({
                    directory: "packages/@vivliostyle/theme-bunko",
                    type: "git",
                    url: "git+https://github.com/vivliostyle/themes.git",
                });
                return [2 /*return*/];
        }
    });
}); });
test.skip("NpmApi.SearchPackage method", function () { return __awaiter(void 0, void 0, void 0, function () {
    var packageName, pkgName, results;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                packageName = "@vivliostyle/theme-bunko";
                pkgName = encodeURIComponent(packageName);
                return [4 /*yield*/, npm_api_js_1.default.SearchPackage(pkgName, 1)];
            case 1:
                results = _a.sent();
                expect(results[0].package.name).toBe("@vivliostyle/theme-bunko");
                return [2 /*return*/];
        }
    });
}); });
// NPM からテーマを探す
test("search vivliostyle-themes", function () { return __awaiter(void 0, void 0, void 0, function () {
    var themeManager, themes, theme;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                themeManager = new ThemeManager_1.default(GitHubAccessToken);
                expect(themeManager.serchQuery).toBe("keywords:vivliostyle-theme");
                expect(themeManager.themes.length).toBe(0);
                return [4 /*yield*/, themeManager.searchFromNpm()];
            case 1:
                themes = _a.sent();
                theme = themes[0];
                // console.log(theme);
                expect(theme.name).toBe("@vivliostyle/theme-bunko");
                expect(theme.description).toBe("文庫用のテーマ");
                expect(theme.category).toBe("novel");
                expect(theme.style).toBe("theme_common.css");
                expect(theme.files['theme_common.css']).toContain('@charset "UTF-8"');
                return [2 /*return*/];
        }
    });
}); });
// // package.jsonのvivliostyle/topicsを元に検索
test('search themes by topic', function () { return __awaiter(void 0, void 0, void 0, function () {
    var themeManager, themes, keyword, result, keyword2, result2, keyword3, result3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                themeManager = new ThemeManager_1.default(GitHubAccessToken);
                return [4 /*yield*/, themeManager.searchFromNpm()];
            case 1:
                themes = _a.sent();
                keyword = '小説';
                result = themes.filter(function (theme) {
                    return theme.topics.includes(keyword);
                });
                expect(result[0].name).toBe('@vivliostyle/theme-bunko');
                keyword2 = 'Report';
                result2 = themes.filter(function (theme) {
                    // console.log(theme.name,theme.topics);
                    return theme.topics.includes(keyword2);
                });
                // TODO: nameでソートしたほうが良いかも
                expect(result2.length).toBe(1);
                expect(result2[0].name).toBe('@vivliostyle/theme-academic');
                keyword3 = 'hb';
                result3 = themes.filter(function (theme) {
                    var regexp = new RegExp(keyword3, 'i');
                    var num = theme.topics.filter(function (topic) {
                        return regexp.test(topic);
                    }).length;
                    return num > 0;
                });
                expect(result3.length).toBe(1);
                expect(result3[0].name).toBe('@vivliostyle/theme-techbook');
                return [2 /*return*/];
        }
    });
}); });
// テーマ名を指定してNPMから取得
test("get package theme", function () { return __awaiter(void 0, void 0, void 0, function () {
    var themeManager, theme, theme_1, e_1, err, theme_2, e_2, err;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                themeManager = new ThemeManager_1.default(GitHubAccessToken);
                return [4 /*yield*/, themeManager.getTheme("@vivliostyle/theme-bunko")];
            case 1:
                theme = _a.sent();
                expect(theme).not.toBeNull();
                expect(theme.name).toBe("@vivliostyle/theme-bunko");
                expect(theme.description).toBe("文庫用のテーマ");
                expect(theme.version).toBe("0.5.0");
                expect(theme.author).toBe("Vivliostyle <mail@vivliostyle.org>");
                expect(theme.topics).toStrictEqual(["小説", "縦書き"]);
                _a.label = 2;
            case 2:
                _a.trys.push([2, 4, , 5]);
                return [4 /*yield*/, themeManager.getTheme("vivliostyle-theme-thesis")];
            case 3:
                theme_1 = _a.sent();
                return [3 /*break*/, 5];
            case 4:
                e_1 = _a.sent();
                err = e_1;
                expect(err.message).toBe('GitHub repository not found : vivliostyle-theme-thesis');
                return [3 /*break*/, 5];
            case 5:
                _a.trys.push([5, 7, , 8]);
                return [4 /*yield*/, themeManager.getTheme("@vivliostyle/not-exists")];
            case 6:
                theme_2 = _a.sent();
                return [3 /*break*/, 8];
            case 7:
                e_2 = _a.sent();
                err = e_2;
                expect(err.message).toBe('theme not found');
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); });
/**
 * CSSファイル単体(未完成)
 */
test.skip("single file theme", function () { return __awaiter(void 0, void 0, void 0, function () {
    var theme, style;
    return __generator(this, function (_a) {
        theme = new ThemeManager_1.SingleFileTheme("https://vivliostyle.github.io/vivliostyle_doc/samples/gingatetsudo/style.css");
        style = theme.files["style.css"];
        expect(style).not.toBeNull();
        return [2 /*return*/];
    });
}); });
test("get file", function () { return __awaiter(void 0, void 0, void 0, function () {
    var themeManager, theme, filepaths;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                themeManager = new ThemeManager_1.default(GitHubAccessToken);
                return [4 /*yield*/, themeManager.getTheme("@vivliostyle/theme-bunko")];
            case 1:
                theme = _a.sent();
                filepaths = Object.keys(theme.files);
                expect(filepaths[0]).toBe("theme_common.css");
                expect(theme === null || theme === void 0 ? void 0 : theme.files[filepaths[0]]).not.toBeNull();
                return [2 /*return*/];
        }
    });
}); });
/**
 * ローカルへ書き出し(未完成)
 */
test.skip("write to disk", function () { return __awaiter(void 0, void 0, void 0, function () {
    var themeManager, theme, tmpDir;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                themeManager = new ThemeManager_1.default(GitHubAccessToken);
                return [4 /*yield*/, themeManager.getTheme("@vivliostyle/theme-bunko")];
            case 1:
                theme = _a.sent();
                tmpDir = fs_1.default.mkdtempSync("themeManager_");
                Object.entries(theme.files).forEach(function (_a) {
                    var filepath = _a[0], data = _a[1];
                    fs_1.default.writeFileSync(path.join(tmpDir, filepath), new DataView(data));
                });
                return [2 /*return*/];
        }
    });
}); });
