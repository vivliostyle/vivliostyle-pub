import {Select} from '@chakra-ui/react';
import {FC} from 'react';
import {useBranchSelector} from './hooks';

export const BranchSelector: FC = () => {
  const {onChangeBranch, branch, branches} = useBranchSelector();

  return (
    <Select onChange={onChangeBranch} value={branch ?? ''}>
      {branches.map((name) => (
        <option value={name} key={name}>
          {name}
        </option>
      ))}
    </Select>
  );
};
