import React, { useCallback, useState } from 'react';
import * as UI from './ui';

export const CommitSessionButton = ({
  user,
  sessionId,
  branch,
  disabled,
  onDidSaved = () => {},
}: {
  user: firebase.User;
  sessionId: string;
  branch: string | undefined;
  disabled?: boolean;
  onDidSaved?: () => void;
}) => {
  const [busy, setBusy] = useState(false);
  const onClick = useCallback(() => {
    (async () => {
      setBusy(true);
      try {
        await fetch('/api/github/commitSession', {
          method: 'PUT',
          body: JSON.stringify({ sessionId, branch }),
          headers: {
            'content-type': 'application/json',
            'x-id-token': await user.getIdToken(),
          },
        });
        onDidSaved();
      } catch (error) {
        console.error(error);
      } finally {
        setBusy(false);
      }
    })();
  }, [user, sessionId, branch, onDidSaved]);

  return (
    <UI.Button
      {...{ onClick }}
      isDisabled={disabled}
      isLoading={busy}
      loadingText="Saving document"
    >
      Save document
    </UI.Button>
  );
};
