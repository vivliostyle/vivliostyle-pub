import React, {
  Dispatch,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as UI from '@components/ui';
import {BranchSelecter} from './BranchSelecter';
import {CommitSessionButton} from './CommitSessionButton';
import {FileUploadModal} from './FileUploadModal';
import {
  Repository,
  useRepositoryContext,
} from '@middlewares/useRepositoryContext';
import {AppContext, useAppContext} from '@middlewares/useAppContext';

import {usePreviewSourceContext} from '@middlewares/usePreviewSourceContext';
import {useDisclosure} from '@chakra-ui/react';
import {WebApiFs} from '@middlewares/WebApiFS';
import {EditIcon, HamburgerIcon, RepeatIcon, ViewIcon} from '@chakra-ui/icons';
import {Fs, Theme} from 'theme-manager';
import {VivliostyleConfigSchema} from '@middlewares/vivliostyle.config';

const fs = {} as Fs;

// vivliostyle.config.jsのthemeを使用する
class CustomTheme implements Theme {
  name: string = 'custom-theme';
  category: string = '';
  topics: string[] = [];
  style: string = 'theme.css';
  description: string = 'Custom theme';
  version: string = '1.0';
  author: string = 'Vivliostyle';
  files: {[filepath: string]: any} = {};
  fs: Fs;

  app: AppContext;
  repository: Repository;

  private constructor(
    fs: Fs,
    app: AppContext,
    repository: Repository,
    style: string,
  ) {
    this.app = app;
    this.repository = repository;
    this.fs = fs;
    this.style = style;
    console.log('new CustomTheme', app.user, repository);
  }

  private async process() {
    console.log('CustomTheme process', this.style);
    const stylesheet = await this.fs.readFile(this.style);
    await this.app.vpubFs!.writeFile(this.style, stylesheet);
    console.log('setup custom theme');
  }

  public static async create(app: AppContext, repository: Repository) {
    console.log('create custom theme', repository.branch);
    if (!(app.user && repository.owner && repository.repo)) {
      return null;
    }
    const props = {
      user: app.user!,
      owner: repository.owner!,
      repo: repository.repo!,
      branch: repository.branch!,
    };
    console.log('props', props);
    const fs = await WebApiFs.open(props);
    // 設定ファイルの読み込み
    const configString = (await fs.readFile('vivliostyle.config.js')) as string;
    console.log('[create custom theme].config', configString);
    // 設定ファイルからthemeを取得
    // TODO: entry別のテーマ
    const configJsonString = configString
      .replace('module.exports = ', '')
      .replaceAll(/^\s*(.+):/gm, '"$1":')
      .replaceAll(`'`, '"')
      .replaceAll(/,[\s\n]*([\]}])/g, '$1')
      .replaceAll(/};/g, '}');
    const config = JSON.parse(configJsonString) as VivliostyleConfigSchema;
    if (!config || !config.theme) {
      return null;
    }
    const theme = new CustomTheme(fs, app, repository, config.theme);
    await theme.process();
    return theme;
  }

  public getStylePath() {
    // TODO: vivliostyle.config.jsを処理してファイルパスを取得する
    // リポジトリからstylesheetを取得してApplicationCacheに追加
    return 'theme.css';
  }
}

export function MenuBar({
  isProcessing,
  isPresentationMode,
  setPresentationMode,
  setWarnDialog,
  onBuildPDFButtonClicked,
  isExplorerVisible,
  onToggleExplorer,
  isEditorVisible,
  onToggleEditor,
  isPreviewerVisible,
  onTogglePreviewer,
  isAutoReload,
  setAutoReload,
  onReload,
}: {
  isProcessing: boolean;
  isPresentationMode: boolean;
  setPresentationMode: Dispatch<React.SetStateAction<boolean>>;
  setWarnDialog: Dispatch<React.SetStateAction<boolean>>;
  onBuildPDFButtonClicked: () => void;
  isExplorerVisible: boolean;
  onToggleExplorer: (f: boolean) => void;
  isEditorVisible: boolean;
  onToggleEditor: (f: boolean) => void;
  isPreviewerVisible: boolean;
  onTogglePreviewer: (f: boolean) => void;
  isAutoReload: boolean;
  setAutoReload: (f: boolean) => void;
  onReload: () => void;
}) {
  const app = useAppContext();
  const repository = useRepositoryContext();
  const previewSource = usePreviewSourceContext();
  const plainTheme = useMemo(() => {
    // Viewerのデフォルトスタイルを使用するテーマ
    const plainTheme = {
      name: 'plain-theme',
      category: '',
      topics: [],
      style: '',
      description: 'Plain theme',
      version: '1.0',
      author: 'Vivliostyle',
      files: {},
      fs: fs,
      getStylePath: () => {
        return null;
      },
    } as Theme;
    return plainTheme;
  }, []);

  const [customTheme, setCustomTheme] = useState<Theme | null>(null);
  useEffect(() => {
    // ブランチが変更されたらカスタムテーマを読み直し
    // TODO: config.jsが編集されたらカスタムテーマを読み直し
    CustomTheme.create(app, repository).then((theme) => {
      setCustomTheme(theme);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app, repository.branch]);

  const onDidSaved = useCallback(() => {
    console.log('onDidSaved');
    setWarnDialog(false);
  }, [setWarnDialog]);

  const {
    isOpen: isOpenFileUploadModal,
    onOpen: onOpenFileUploadModal,
    onClose: onCloseFileUploadModal,
  } = useDisclosure();

  /**
   * スタイルシートが変更された
   * @param theme
   */
  const onThemeSelected = useCallback(
    (theme: Theme) => {
      console.log('theme selected', theme);
      previewSource.changeTheme(theme);
    },
    [previewSource],
  );

  return (
    <UI.Flex w="100%" h={'3rem'} px={8} justify="space-between" align="center">
      <UI.Flex align="center">
        {repository.owner} / {repository.repo} /
        <UI.Box w="180px" px="4">
          <BranchSelecter />
        </UI.Box>
        {app.user /*&& session?.id*/ && (
          <div>
            <CommitSessionButton {...{onDidSaved}} />
          </div>
        )}
      </UI.Flex>
      <UI.Flex align="center">
        {isProcessing && <UI.Spinner style={{marginRight: '10px'}} />}
        <UI.ButtonGroup>
          <UI.Button
            title="Project Explorer Visiblity"
            onClick={() => onToggleExplorer(!isExplorerVisible)}
            border={
              isExplorerVisible ? 'solid 2px black' : 'solid 2px lightgray'
            }
          >
            <HamburgerIcon />
          </UI.Button>
          <UI.Button
            title="Editor Visiblity"
            onClick={() => onToggleEditor(!isEditorVisible)}
            border={isEditorVisible ? 'solid 2px black' : 'solid 2px lightgray'}
          >
            <EditIcon />
          </UI.Button>
          <UI.Button
            title="Preview Visiblity"
            onClick={() => onTogglePreviewer(!isPreviewerVisible)}
            border={
              isPreviewerVisible ? 'solid 2px black' : 'solid 2px lightgray'
            }
          >
            <ViewIcon />
          </UI.Button>
          {/* リロードボタンはうまく動かないのでとりあえず無効化
            <UI.Button
            title="Preview Reload"
            onClick={onReload}
            disabled={!isPreviewerVisible}
          >
            <RepeatIcon />
          </UI.Button> */}
        </UI.ButtonGroup>
        &nbsp;
        <UI.Menu>
          <UI.MenuButton as={UI.Button}>
            <UI.Icon name="chevron-down" /> Actions
          </UI.MenuButton>
          <UI.MenuList>
            <UI.MenuItem
              key="presen"
              onClick={() => {
                setPresentationMode(!isPresentationMode);
              }}
            >
              {isPresentationMode ? '✔ ' : ' '}Presentation Mode
            </UI.MenuItem>
            <UI.MenuItem
              key="autoReload"
              onClick={() => {
                setAutoReload(!isAutoReload);
              }}
            >
              {isAutoReload ? '✔ ' : ' '}Auto reload
            </UI.MenuItem>
            <UI.MenuDivider />
            <UI.MenuGroup title="Theme">
              <UI.MenuItem
                key={plainTheme.name}
                onClick={() => onThemeSelected(plainTheme)}
              >
                {plainTheme.name === previewSource.theme?.name ? '✔ ' : ' '}
                {plainTheme.description}
              </UI.MenuItem>
              {!customTheme ? null : (
                <UI.MenuItem
                  key={customTheme.name}
                  onClick={() => onThemeSelected(customTheme)}
                >
                  {customTheme.name === previewSource.theme?.name ? '✔ ' : ' '}
                  {customTheme.description}
                </UI.MenuItem>
              )}
              {app.onlineThemes.map((theme) => (
                <UI.MenuItem
                  key={theme.name}
                  onClick={() => onThemeSelected(theme)}
                >
                  {theme.name === previewSource.theme?.name ? '✔ ' : ' '}
                  {theme.description}
                </UI.MenuItem>
              ))}
            </UI.MenuGroup>
            <UI.MenuDivider />
            <UI.MenuGroup title="Add Files">
              <UI.MenuItem onClick={onOpenFileUploadModal}>
                Add Image
              </UI.MenuItem>
              <FileUploadModal
                user={app.user}
                isOpen={isOpenFileUploadModal}
                onOpen={onOpenFileUploadModal}
                onClose={onCloseFileUploadModal}
              />
            </UI.MenuGroup>
            <UI.MenuDivider />
            <UI.MenuGroup title="Export">
              <UI.MenuItem onClick={onBuildPDFButtonClicked}>PDF</UI.MenuItem>
            </UI.MenuGroup>
          </UI.MenuList>
        </UI.Menu>
      </UI.Flex>
    </UI.Flex>
  );
}
