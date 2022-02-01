import { FileState } from '@middlewares/frontendFunctions';
import { useCurrentFileContext } from '@middlewares/contexts/useCurrentFileContext';
import { useLogContext } from '@middlewares/contexts/useLogContext';
import React, { useCallback, useState } from 'react';
import * as UI from './ui';

export const CommitSessionButton = ({
  onDidSaved = () => {},
}: {
  onDidSaved?: () => void;
}) => {
  const log = useLogContext();
  const currentFile = useCurrentFileContext();
  const [busy, setBusy] = useState(false);
  const onClick = useCallback(() => {
    (async () => {
      setBusy(true);
      try {
        currentFile.commit();
        // log.success('ファイルを保存しました : '+currentFile.file?.name);
        onDidSaved();
      } catch (err:any) {
         log.error(err.message);
      } finally {
        setBusy(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFile, onDidSaved]);

  return (
    <UI.Button
      {...{ onClick }}
      disabled={!(currentFile?.state.state == FileState.saved || currentFile?.state.state == FileState.modified)}
      isLoading={busy}
      loadingText="Saving document"
    >
      Save document
    </UI.Button>
  );
};
