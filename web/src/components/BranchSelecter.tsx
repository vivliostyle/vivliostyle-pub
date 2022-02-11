import React, {useCallback, useState} from 'react';
import * as UI from './ui';
import {useRepositoryContext} from '@middlewares/contexts/useRepositoryContext';
import {useCurrentFileContext} from '@middlewares/contexts/useCurrentFileContext';
import {devConsole, FileState} from '@middlewares/frontendFunctions';
import {ArrowRightIcon} from '@chakra-ui/icons';
import {t} from 'i18next';

const {_log, _err} = devConsole('[BranchSelector]');

const __create_branch__ = '__create_Branch__';
const __delete_branch__ = '__delete_Branch__';

export const BranchSelecter = () => {
  const repository = useRepositoryContext();
  const currentFile = useCurrentFileContext();
  const [dialogName, setDialogName] = useState<string>('');

  const onChangeBranch = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      _log('onChangeBranch', currentFile.state);
      if (e.target.value === __create_branch__) {
        setDialogName(__create_branch__);
        return;
      } else if (e.target.value === __delete_branch__) {
        setDialogName(__delete_branch__);
        return;
      }
      if (
        currentFile.state.state == FileState.modified ||
        currentFile.state.state == FileState.saved
      ) {
        if (!confirm(t('ファイルが保存されていません。変更を破棄しますか?'))) {
          return;
        }
      }
      repository.selectBranch(e.target.value);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [currentFile.state, repository],
  );

  const CreateBranchDialog = ({branch}: {branch: string}) => {
    const [fromBranch, setFromBranch] = useState<string>(branch);
    const [newBranch, setNewBranch] = useState<string>('');

    const handleCreateBranch = () => {
      _log('create branch', fromBranch, newBranch);
      setDialogName('');
      repository.createBranch(fromBranch, newBranch);
    };

    return (
      <UI.Modal
        isOpen={dialogName === __create_branch__}
        onClose={() => {
          setDialogName('');
        }}
        isCentered
        size={'xl'}
      >
        <UI.ModalOverlay />
        <UI.ModalContent>
          <UI.ModalHeader>{t('ブランチ作成')}</UI.ModalHeader>
          <UI.ModalCloseButton />
          <UI.ModalBody backgroundColor={'lightgray'}>
            <UI.Select
              background={'white'}
              w="30%"
              display={'inline-block'}
              verticalAlign={'middle'}
              value={fromBranch}
              onChange={(e) => setFromBranch(e.target.value)}
            >
              {repository.state.branches.map((name) => (
                <option value={name} key={name}>
                  {name}
                </option>
              ))}
            </UI.Select>
            <ArrowRightIcon />
            <UI.Input
              w="30%"
              background={'white'}
              verticalAlign={'middle'}
              value={newBranch}
              onChange={(e) => setNewBranch(e.target.value)}
            />
            &nbsp;
            <UI.Button verticalAlign={'middle'} onClick={handleCreateBranch}>
              {t('作成')}
            </UI.Button>
          </UI.ModalBody>
        </UI.ModalContent>
      </UI.Modal>
    );
  };

  return (
    <>
      <CreateBranchDialog branch={repository.state.branch!} />
      <UI.Select
        onChange={onChangeBranch}
        value={repository.state.branch ?? ''}
      >
        <optgroup label={t('ブランチ')}>
          {repository.state.branches.map((name) => (
            <option value={name} key={name}>
              {name}
            </option>
          ))}
          {repository.state.branches.length == 0 ? (
            <option>{t('ブランチが存在しません')}</option>
          ) : null}
        </optgroup>
        <optgroup label={t('ブランチ操作')}>
          <option value={__create_branch__}>{t('ブランチ作成')}</option>
          {/* <option value={__delete_branch__}>{t('ブランチ削除')}</option> */}
        </optgroup>
      </UI.Select>
    </>
  );
};
