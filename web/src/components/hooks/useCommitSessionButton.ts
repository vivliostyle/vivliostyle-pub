import {useCallback, useState} from 'react';
import {FileState} from '@middlewares/frontendFunctions';
import {useCurrentFileContext} from '@middlewares/contexts/useCurrentFileContext';
import {useLogContext} from '@middlewares/contexts/useLogContext';

export type OnDidSaved = () => void;

export const useCommitSessionButton = (onDidSaved: OnDidSaved) => {
  const log = useLogContext();
  const currentFile = useCurrentFileContext();
  const [isBusy, setIsBusy] = useState(false);
  const onClickSave = useCallback(() => {
    (async () => {
      setIsBusy(true);
      try {
        currentFile.commit();
        // log.success('ファイルを保存しました : '+currentFile.file?.name);
        onDidSaved();
      } catch (err: any) {
        log.error(err.message);
      } finally {
        setIsBusy(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFile, onDidSaved]);

  return {
    isBusy,
    isDisabled: !(
      currentFile?.state.state == FileState.saved ||
      currentFile?.state.state == FileState.modified
    ),
    onClickSave,
  };
};
