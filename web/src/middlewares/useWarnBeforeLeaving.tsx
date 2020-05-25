import {useEffect, useState} from 'react';

export function useWarnBeforeLeaving() {
  const [isDirty, setIsDirty] = useState<boolean>(false);
  useEffect(() => {
    function dialog(e: BeforeUnloadEvent) {
      if (!isDirty) {
        return undefined;
      }
      const message = '変更を保存していません。本当に離脱しますか？';
      (e || window.event).returnValue = message;
      return message;
    }
    window.addEventListener('beforeunload', dialog);
    return () => {
      window.removeEventListener('beforeunload', dialog);
    };
  }, [isDirty]);
  return setIsDirty;
}
