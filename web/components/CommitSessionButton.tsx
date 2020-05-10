import React, { useCallback, useState } from 'react';
import * as UI from './ui';

export const CommitSessionButton = ({
  user,
  sessionId,
  disabled,
  onDidSaved = () => {},
}: {
  user: firebase.User;
  sessionId: string;
  disabled?: boolean;
  onDidSaved?: () => void;
}) => {
  const [busy, setBusy] = useState(false);
  const onClick = useCallback(() => {
    (async () => {
      setBusy(true);
      try {
        const idToken = await user.getIdToken();
        await fetch('/api/github/commitSession', {
          method: 'PUT',
          body: JSON.stringify({ sessionId }),
          headers: {
            'content-type': 'application/json',
            'x-id-token': idToken,
          },
        });
        onDidSaved();
      } catch (error) {
        console.error(error);
      } finally {
        setBusy(false);
      }
    })();
  }, [user, sessionId]);

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