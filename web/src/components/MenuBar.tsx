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
  useRepositoryContext,
} from '@middlewares/contexts/useRepositoryContext';
import {useAppContext} from '@middlewares/contexts/useAppContext';

import {usePreviewSourceContext} from '@middlewares/contexts/usePreviewSourceContext';
import {useDisclosure} from '@chakra-ui/react';
import {EditIcon, HamburgerIcon, ViewIcon} from '@chakra-ui/icons';
import {Fs, Theme} from 'theme-manager';
import { useCurrentThemeContext } from '@middlewares/contexts/useCurrentThemeContext';
import { CustomTheme } from '@middlewares/themes/CustomTheme';

const fs = {} as Fs;

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
  const currentTheme = useCurrentThemeContext();
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
      process: async ()=>{
        return '';
      }
    } as Theme;
    return plainTheme;
  }, []);

  const [customTheme, setCustomTheme] = useState<Theme | null>(null);
  useEffect(() => {
    // ブランチが変更されたらカスタムテーマを読み直し
    // TODO: config.jsが編集されたらカスタムテーマを読み直し
    CustomTheme.create(app, repository).then((theme) => {
      setCustomTheme(theme);
      currentTheme.changeTheme(theme);
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
      currentTheme.changeTheme(theme);
    },
    [currentTheme],
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
                {plainTheme.name === currentTheme.theme?.name ? '✔ ' : ' '}
                {plainTheme.description}
              </UI.MenuItem>
              {!customTheme ? null : (
                <UI.MenuItem
                  key={customTheme.name}
                  onClick={() => onThemeSelected(customTheme)}
                >
                  {customTheme.name === currentTheme.theme?.name ? '✔ ' : ' '}
                  {customTheme.description}
                </UI.MenuItem>
              )}
              {app.onlineThemes.map((theme) => (
                <UI.MenuItem
                  key={theme.name}
                  onClick={() => onThemeSelected(theme)}
                >
                  {theme.name === currentTheme.theme?.name ? '✔ ' : ' '}
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
