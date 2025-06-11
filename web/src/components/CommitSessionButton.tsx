import {FC} from 'react';
import {Button} from '@chakra-ui/react';
import {OnDidSaved, useCommitSessionButton} from './hooks';

export const CommitSessionButton: FC<{
  onDidSaved?: OnDidSaved;
}> = ({onDidSaved = () => {}}) => {
  const {onClickSave, isBusy, isDisabled} = useCommitSessionButton(onDidSaved);

  return (
    <Button
      onClick={onClickSave}
      disabled={isDisabled}
      isLoading={isBusy}
      loadingText="Saving document"
    >
      Save document
    </Button>
  );
};
