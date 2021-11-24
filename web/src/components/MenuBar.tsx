import React, {Dispatch, useCallback, useEffect, useMemo, useState} from 'react';
import * as UI from '@components/ui';
import {BranchSelecter} from './BranchSelecter';
import {CommitSessionButton} from './CommitSessionButton';
import {FileUploadModal} from './FileUploadModal';
import {
  useRepositoryContext,
} from '@middlewares/useRepositoryContext';
import {useAppContext} from '@middlewares/useAppContext';

import { Fs, Theme, ThemeManager} from 'theme-manager';
import {usePreviewSourceContext} from '@middlewares/usePreviewSourceContext';
import {useDisclosure} from '@chakra-ui/react';
import { WebApiFs } from '@middlewares/WebApiFS';

export function MenuBar({
  isProcessing,
  isPresentationMode,
  setPresentationMode,
  setWarnDialog,
  onBuildPDFButtonClicked,
}: {
  isProcessing: boolean;
  isPresentationMode: boolean;
  setPresentationMode: Dispatch<React.SetStateAction<boolean>>;
  setWarnDialog: Dispatch<React.SetStateAction<boolean>>;
  onBuildPDFButtonClicked: () => void;
}) {
  const app = useAppContext();
  const repository = useRepositoryContext();
  const previewSource = usePreviewSourceContext();

  const themes = useMemo(()=>{
    const fs = {} as Fs;

    // Viewerのデフォルトスタイルを使用するテーマ
    const planeTheme = {
      name:'plane-theme',
      category:'',
      topics:[],
      style:'',
      description:'Plane theme',
      version:'1.0',
      author:'Vivliostyle',
      files: {},
      fs: fs,
      getStylePath: ()=>{
        return null;
      }
    } as Theme;
    
    // vivliostyle.config.jsのthemeを使用する
    const customeTheme ={
      name:'custom-theme',
      category:'',
      topics:[],
      style:'',
      description:'Custom theme',
      version:'1.0',
      author:'Vivliostyle',
      files: {},
      fs: fs,
      getStylePath: ()=>{
        // TODO: vivliostyle.config.jsを処理してファイルパスを取得する
        // リポジトリからstylesheetを取得してApplicationCacheに追加
        WebApiFs.open({
          user:app.user!,
          owner:repository.owner!,
          repo:repository.repo!,
          branch:repository.branch!,
        }).then(fs=>{
          fs.readFile('theme.css').then((stylesheet)=>{
            app.vpubFs!.writeFile('theme.css',stylesheet).then(()=>{
              console.log('setup custom theme');
            });      
          })
        })
        return '/vpubfs/theme.css';
      }
    } as Theme;
    return [planeTheme,customeTheme,...app.onlineThemes];
  },[app,repository]);

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
  const onThemeSelected = useCallback((theme: Theme)=>{
    console.log('theme selected',theme);
    previewSource.changeTheme(theme);
  },[previewSource]);

  return (
    <UI.Flex w="100%" h={'3rem'} px={8} justify="space-between" align="center">
      <UI.Flex align="center">
        {repository.owner} / {repository.repo} /
        <UI.Box w="180px" px="4">
          <BranchSelecter />
        </UI.Box>
        {app.user /*&& session?.id*/ && (
          <div>
            <CommitSessionButton
              {...{onDidSaved}}
            />
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
                  {theme.name === previewSource.theme?.name ? '✔ ' : ' '}{theme.description}
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
