import fs from "fs";
import * as path from "upath";
import { PackageTheme } from ".";
import { GitHubIO } from "./srcIO";
import ThemeManager, { SingleFileTheme } from "./ThemeManager";
import NpmApi from "npm-api.js"; // npm-apiとnpm-api.jsという別のパッケージがあるので注意

// GitHubAccessTokenなしだとAPIを叩けるのが60回/h
// ひとつのパッケージごとに1アクセスするのですぐに限度が来るので注意
// https://docs.github.com/ja/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token
const GitHubAccessToken: string | null = null;

test("GitHub I/O parseURL", async () => {
  const component = GitHubIO.parseURL(
    "git+https://github.com/vivliostyle/themes.git/package.json"
  );
  expect(component.owner).toBe("vivliostyle");
  expect(component.repo).toBe("themes");
  expect(component.path).toBe("package.json");

  const component2 = GitHubIO.parseURL(
    "git+https://github.com/vivliostyle/themes.git"
  );
  expect(component2.owner).toBe("vivliostyle");
  expect(component2.repo).toBe("themes");
  expect(component2.path).toBe(undefined);
});

/**
 * 全ファイル取得(未完成)
 */
test.skip("GitHub I/O findAll", async()=>{
    const io = new GitHubIO('vivliostyle','themes',GitHubAccessToken);
    const filenames = await io.findAll();
    expect(filenames).toStrictEqual([]);
})

test("PackageTheme.getPackageJson method", async () => {
  const io = new GitHubIO("vivliostyle", "themes", GitHubAccessToken);
  const path = "packages/@vivliostyle/theme-bunko";
  const pkgJson = (await PackageTheme.getPackageJson(path, io)) as unknown as {
    name: string;
    description: string;
    version: string;
    author: string;
    vivliostyle: { theme: { topics: string[] } };
  };
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
});

/*
 * NpmApiの仕様確認
 */
test.skip("NpmApi.getPackage", async () => {
  const packageName = "@vivliostyle/theme-bunko";
  const pkgName = encodeURIComponent(packageName);
  const results = await NpmApi.getPackage(pkgName);
  expect(results).not.toBeNull();
  expect(results.collected.metadata.repository).toStrictEqual({
    directory: "packages/@vivliostyle/theme-bunko",
    type: "git",
    url: "git+https://github.com/vivliostyle/themes.git",
  });
});

test.skip("NpmApi.SearchPackage method", async () => {
    const packageName = "@vivliostyle/theme-bunko";
    const pkgName = encodeURIComponent(packageName);
    const results = await NpmApi.SearchPackage(pkgName, 1);
    expect(results[0].package.name).toBe("@vivliostyle/theme-bunko");
});

// NPM からテーマを探す
test("search vivliostyle-themes", async () => {
  const themeManager = new ThemeManager(GitHubAccessToken);
  expect(themeManager.serchQuery).toBe("keywords:vivliostyle-theme");
  expect(themeManager.themes.length).toBe(0);
  // PackageThemeクラスのインスタンスの配列を返す
  const themes = await themeManager.searchFromNpm();
  // 2021/11/10現在,npmにvivliostyle-themeタグが付いたパッケージは6個あるが
  // vivliostyle-theme-thesis はGitHubではなくnpmのリポジトリにあるので対応できない
  // expect(themes.length).toBe(6);
  // どんな情報が取得できるか
  const theme = themes[0];
  // console.log(theme);
  expect(theme.name).toBe("@vivliostyle/theme-bunko");
  expect(theme.description).toBe("文庫用のテーマ");
  expect(theme.category).toBe("novel");
  expect(theme.style).toBe("theme_common.css");
  expect(theme.files['theme_common.css']).toContain('@charset "UTF-8"');
});

// // package.jsonのvivliostyle/topicsを元に検索
test('search themes by topic', async () => {
    const themeManager = new ThemeManager(GitHubAccessToken);
    const themes = await themeManager.searchFromNpm(); 

    // ひとつの結果が得られるケース
    const keyword = '小説';
    const result = themes.filter((theme) => {
        return theme.topics.includes(keyword);
    })
    expect(result[0].name).toBe('@vivliostyle/theme-bunko');

    // 複数の結果が得られるケース
    const keyword2 = 'Report';
    const result2 = themes.filter((theme) => {
        // console.log(theme.name,theme.topics);
        return theme.topics.includes(keyword2);
    })
    // TODO: nameでソートしたほうが良いかも
    expect(result2.length).toBe(1);
    expect(result2[0].name).toBe('@vivliostyle/theme-academic');
    // expect(result2[1].name).toBe('vivliostyle-akashi-kosen-bulletin');

    // 部分一致で検索
    const keyword3 = 'hb'; // Techbook, phb にマッチする
    const result3 = themes.filter((theme) => {
        const regexp = new RegExp(keyword3, 'i');
        const num = theme.topics.filter((topic) => {
            return regexp.test(topic);
        }).length;
        return num > 0;
    })
    expect(result3.length).toBe(1);
    expect(result3[0].name).toBe('@vivliostyle/theme-techbook');
//    expect(result3[1].name).toBe('vivliostyle-theme-dnd-5e-phb');
})

// テーマ名を指定してNPMから取得
test("get package theme", async () => {
  const themeManager = new ThemeManager(GitHubAccessToken);
  const theme = await themeManager.getTheme("@vivliostyle/theme-bunko");
  expect(theme).not.toBeNull();
  expect(theme!.name).toBe("@vivliostyle/theme-bunko");
  expect(theme!.description).toBe("文庫用のテーマ");
  expect(theme!.version).toBe("0.5.0");
  expect(theme!.author).toBe("Vivliostyle <mail@vivliostyle.org>");
  expect(theme!.topics).toStrictEqual(["小説", "縦書き"]);

  // GitHubにリポジトリが存在しないパッケージは取得できない
  try {
    const theme = await themeManager.getTheme("vivliostyle-theme-thesis");
  } catch (e:unknown) {
    const err = e as Error;
    expect(err.message).toBe('GitHub repository not found : vivliostyle-theme-thesis');
  }

  // 存在しないパッケージは取得できない
  try {
    const theme = await themeManager.getTheme("@vivliostyle/not-exists");      
  } catch (e:unknown) {
    const err = e as Error;
    expect(err.message).toBe('theme not found');
  }
});

/**
 * CSSファイル単体(未完成)
 */
test.skip("single file theme", async () => {
  const theme = new SingleFileTheme(
    "https://vivliostyle.github.io/vivliostyle_doc/samples/gingatetsudo/style.css"
  );
  const style = theme.files["style.css"];
  expect(style).not.toBeNull();
});

test("get file", async () => {
  const themeManager = new ThemeManager(GitHubAccessToken);
  const theme = await themeManager.getTheme("@vivliostyle/theme-bunko");
  const filepaths = Object.keys(theme!.files);
  expect(filepaths[0]).toBe("theme_common.css");
  expect(theme?.files[filepaths[0]]).not.toBeNull();
});

/**
 * ローカルへ書き出し(未完成)
 */
test.skip("write to disk", async () => {
  const themeManager = new ThemeManager(GitHubAccessToken);
  const theme = await themeManager.getTheme("@vivliostyle/theme-bunko");
  const tmpDir = fs.mkdtempSync("themeManager_");
  Object.entries(theme!.files).forEach(([filepath, data]) => {
    fs.writeFileSync(path.join(tmpDir, filepath), new DataView(data));
  });
});
