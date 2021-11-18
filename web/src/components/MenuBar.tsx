import React, {Dispatch, useCallback, useEffect, useState} from 'react';
import * as UI from '@components/ui';
import {BranchSelecter} from './BranchSelecter';
import {CommitSessionButton} from './CommitSessionButton';
import {FileUploadModal} from './FileUploadModal';
import {
  useRepositoryContext,
} from '@middlewares/useRepositoryContext';
import {useAppContext} from '@middlewares/useAppContext';

import {Theme, ThemeManager} from 'theme-manager';
import {usePreviewSourceContext} from '@middlewares/usePreviewSourceContext';
import {useDisclosure} from '@chakra-ui/react';
import { FileState } from '@middlewares/frontendFunctions';

const GitHubAccessToken: string | null =
  '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';

const themeManager = new ThemeManager(GitHubAccessToken);

export function MenuBar({
  status,
  isProcessing,
  isPresentationMode,
  setPresentationMode,
  setStatus,
  setWarnDialog,
  onBuildPDFButtonClicked,
}: {
  status: FileState;
  isProcessing: boolean;
  isPresentationMode: boolean;
  setPresentationMode: Dispatch<React.SetStateAction<boolean>>;
  setStatus: Dispatch<React.SetStateAction<FileState>>;
  setWarnDialog: Dispatch<React.SetStateAction<boolean>>;
  onBuildPDFButtonClicked: () => void;
}) {
  const app = useAppContext();
  const repository = useRepositoryContext();
  const previewSource = usePreviewSourceContext();

  const [themes, setThemes] = useState<Theme[]>([]);

  useEffect(() => {
    if(!app.user){return;}
    themeManager.searchFromNpm().then((themeList)=>{
      setThemes(themeList);
    });
  }, [app.user]);

  const onDidSaved = useCallback(() => {
    console.log('onDidSaved');
    setStatus('clean');
    setWarnDialog(false);
  }, [setStatus, setWarnDialog]);

  const {
    isOpen: isOpenFileUploadModal,
    onOpen: onOpenFileUploadModal,
    onClose: onCloseFileUploadModal,
  } = useDisclosure();

  /**
   * スタイルシートが変更された
   * @param theme
   */
  function onThemeSelected(theme: Theme) {
    previewSource.changeTheme(theme);
  }

  return (
    <UI.Flex w="100%" h={'3rem'} px={8} justify="space-between" align="center">
      <UI.Flex align="center">
        {repository.owner} / {repository.repo} /
        <UI.Box w="180px" px="4">
          <BranchSelecter />
        </UI.Box>
        {/* {status === 'saved' && <UI.Text>Document updated : </UI.Text>} */}
        {app.user /*&& session?.id*/ && (
          <div>
            <CommitSessionButton
              {...{onDidSaved}}
              disabled={!(status == 'saved' || status == 'modified')}
            />
            {status}
          </div>
        )}
      </UI.Flex>
      <UI.Flex align="center">
        {isProcessing && <UI.Spinner style={{marginRight: '10px'}} />}
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
            <UI.MenuDivider />
            <UI.MenuGroup title="Theme">
              {themes.map((theme) => (
                <UI.MenuItem
                  key={theme.name}
                  onClick={() => onThemeSelected(theme)}
                >
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
