import React, {
  Dispatch,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {useRepositoryContext} from '@middlewares/contexts/useRepositoryContext';
import {useAppContext} from '@middlewares/contexts/useAppContext';

import {useDisclosure} from '@chakra-ui/react';
import {Theme} from 'theme-manager';
import {useCurrentThemeContext} from '@middlewares/contexts/useCurrentThemeContext';
import {CustomTheme} from '@middlewares/themes/CustomTheme';
import {PlainTheme} from '@middlewares/themes/PlainTheme';
export type OnBuildPDFButtonClicked = (
  theme: Theme | null,
  httpMode: boolean,
  branch: string | null,
) => void;

export const useMenuBar = (
  setWarnDialog: Dispatch<React.SetStateAction<boolean>>,
  onBuildPDFButtonClicked: OnBuildPDFButtonClicked,
) => {
  const app = useAppContext();
  const currentTheme = useCurrentThemeContext();
  const repository = useRepositoryContext();
  const plainTheme = useMemo(() => {
    // Viewerのデフォルトスタイルを使用するテーマ
    const plainTheme = new PlainTheme();
    return plainTheme;
  }, []);

  const [customTheme, setCustomTheme] = useState<Theme | null>(null);
  useEffect(() => {
    // ブランチが変更されたらカスタムテーマを読み直し
    // ブランチ毎に保存したテーマを保持する
    // TODO: config.jsが編集されたらカスタムテーマを読み直し
    CustomTheme.create(app, repository)
      .then((theme) => {
        if (theme) {
          setCustomTheme(theme);
          currentTheme.changeTheme(theme);
        } else {
          currentTheme.changeTheme(plainTheme);
        }
      })
      .catch(() => {
        currentTheme.changeTheme(plainTheme);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app, repository.state.branch]);

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

  const onBuildPDFButtonClickedInternal = useCallback(() => {
    onBuildPDFButtonClicked(
      currentTheme.state?.theme,
      true,
      repository.state.branch,
    );
  }, [currentTheme, onBuildPDFButtonClicked, repository.state.branch]);

  return {
    appState: app.state,
    repositoryState: repository.state,
    currentTheme,
    plainTheme,
    customTheme,
    onDidSaved,
    onThemeSelected,
    isOpenFileUploadModal,
    onOpenFileUploadModal,
    onCloseFileUploadModal,
    onBuildPDFButtonClickedInternal,
  };
};
