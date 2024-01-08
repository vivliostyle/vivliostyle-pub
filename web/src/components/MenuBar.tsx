import {Dispatch, FC, SetStateAction} from 'react';
import {BranchSelector} from './BranchSelector';
import {CommitSessionButton} from './CommitSessionButton';
import {FileUploadModal} from './FileUploadModal';
import {EditIcon, HamburgerIcon, ViewIcon} from '@chakra-ui/icons';
import {OnBuildPDFButtonClicked, useMenuBar} from './hooks';
import {
  Box,
  Button,
  ButtonGroup,
  Flex,
  Icon,
  Menu,
  MenuButton,
  MenuDivider,
  MenuGroup,
  MenuItem,
  MenuList,
  Spinner,
} from '@chakra-ui/react';

export const MenuBar: FC<{
  isProcessing: boolean;
  isPresentationMode: boolean;
  setPresentationMode: Dispatch<SetStateAction<boolean>>;
  setWarnDialog: Dispatch<SetStateAction<boolean>>;
  onBuildPDFButtonClicked: OnBuildPDFButtonClicked;
  isExplorerVisible: boolean;
  onToggleExplorer: (f: boolean) => void;
  isEditorVisible: boolean;
  onToggleEditor: (f: boolean) => void;
  isPreviewerVisible: boolean;
  onTogglePreviewer: (f: boolean) => void;
  isAutoReload: boolean;
  setAutoReload: (f: boolean) => void;
  onReload: () => void;
}> = ({
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
}) => {
  const {
    appState,
    repositoryState,
    currentTheme,
    plainTheme,
    customTheme,
    onDidSaved,
    onThemeSelected,
    isOpenFileUploadModal,
    onOpenFileUploadModal,
    onCloseFileUploadModal,
    onBuildPDFButtonClickedInternal,
  } = useMenuBar(setWarnDialog, onBuildPDFButtonClicked);

  return (
    <Flex w="100%" h={'3rem'} px={8} justify="space-between" align="center">
      <Flex align="center">
        {repositoryState.owner} / {repositoryState.repo} /
        <Box w="180px" px="4">
          <BranchSelector />
        </Box>
        {appState.user /*&& session?.id*/ && (
          <div>
            <CommitSessionButton {...{onDidSaved}} />
          </div>
        )}
      </Flex>
      <Flex align="center">
        {isProcessing && <Spinner style={{marginRight: '10px'}} />}
        <ButtonGroup>
          <Button
            title="Project Explorer Visiblity"
            onClick={() => onToggleExplorer(!isExplorerVisible)}
            border={
              isExplorerVisible ? 'solid 2px black' : 'solid 2px lightgray'
            }
          >
            <HamburgerIcon />
          </Button>
          <Button
            title="Editor Visiblity"
            onClick={() => onToggleEditor(!isEditorVisible)}
            border={isEditorVisible ? 'solid 2px black' : 'solid 2px lightgray'}
          >
            <EditIcon />
          </Button>
          <Button
            title="Preview Visiblity"
            onClick={() => onTogglePreviewer(!isPreviewerVisible)}
            border={
              isPreviewerVisible ? 'solid 2px black' : 'solid 2px lightgray'
            }
          >
            <ViewIcon />
          </Button>
          {/* リロードボタンはうまく動かないのでとりあえず無効化
            <Button
            title="Preview Reload"
            onClick={onReload}
            disabled={!isPreviewerVisible}
          >
            <RepeatIcon />
          </Button> */}
        </ButtonGroup>
        &nbsp;
        <Menu>
          <MenuButton as={Button}>
            <Icon name="chevron-down" /> Actions
          </MenuButton>
          <MenuList>
            <MenuGroup title="Setting">
              <MenuItem
                key="presen"
                onClick={() => {
                  setPresentationMode(!isPresentationMode);
                }}
              >
                {isPresentationMode ? '✔ ' : ' '}Presentation Mode
              </MenuItem>
              <MenuItem
                key="autoReload"
                onClick={() => {
                  setAutoReload(!isAutoReload);
                }}
              >
                {isAutoReload ? '✔ ' : ' '}Auto reload
              </MenuItem>
            </MenuGroup>
            <MenuDivider />
            <MenuGroup title="Theme">
              <MenuItem
                key={plainTheme.name}
                onClick={() => onThemeSelected(plainTheme)}
              >
                {plainTheme.name === currentTheme.state.theme?.name
                  ? '✔ '
                  : ' '}
                {plainTheme.description}
              </MenuItem>
              {!customTheme ? null : (
                <MenuItem
                  key={customTheme.name}
                  onClick={() => onThemeSelected(customTheme)}
                >
                  {customTheme.name === currentTheme.state.theme?.name
                    ? '✔ '
                    : ' '}
                  {customTheme.description}
                </MenuItem>
              )}
              {appState.onlineThemes.map((theme) => (
                <MenuItem
                  key={theme.name}
                  onClick={() => onThemeSelected(theme)}
                >
                  {theme.name === currentTheme.state.theme?.name ? '✔ ' : ' '}
                  {theme.description}
                </MenuItem>
              ))}
            </MenuGroup>
            <MenuDivider />
            <MenuGroup title="Add Files">
              <MenuItem onClick={onOpenFileUploadModal}>Add Image</MenuItem>
              <FileUploadModal
                user={appState.user}
                isOpen={isOpenFileUploadModal}
                onOpen={onOpenFileUploadModal}
                onClose={onCloseFileUploadModal}
                title="Upload Image"
                accept="image/*"
              />
            </MenuGroup>
            <MenuDivider />
            <MenuGroup title="Export">
              <MenuItem onClick={onBuildPDFButtonClickedInternal}>PDF</MenuItem>
            </MenuGroup>
            <MenuDivider />
            <MenuGroup title="Help">
              <MenuItem
                onClick={() => {
                  let option =
                    'width=1024,height=768,menubar=no,toolbar=no,status=no,location=no';
                  window.open(
                    'https://vivliostyle.github.io/vfm/#/vfm',
                    'vfmhelp',
                    option,
                  );
                }}
              >
                VFM Spec
              </MenuItem>
            </MenuGroup>
          </MenuList>
        </Menu>
      </Flex>
    </Flex>
  );
};
