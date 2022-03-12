import React from 'react';
import Link from 'next/link';
import * as UI from './ui';
import {AppContext, useAppContext} from '@middlewares/contexts/useAppContext';
import {useTranslation} from 'react-i18next';
import {ChevronDownIcon} from '@chakra-ui/icons';
import {MenuItem} from '@chakra-ui/react';

const HeaderUserInfo: React.FC = () => {
  const app = useAppContext();
  console.log('user', app.state.user);
  const {t, i18n} = useTranslation();

  return (
    <>
      {app.state.user ? (
        <UI.Menu>
          <UI.MenuButton as={UI.Button} rightIcon={<ChevronDownIcon />}>
            {app.state.user.displayName}
          </UI.MenuButton>
          <UI.MenuList>
            <MenuItem>
              <UI.Link
                href="https://docs.google.com/forms/d/e/1FAIpQLSeh_7rm4RbwKRSHsEXexC4-PBZGK4JJFyQrW_Ee5JGUJHoB5w/viewform?usp=sf_link"
                isExternal={true}
              >
                {t('利用者アンケート')}
              </UI.Link>
            </MenuItem>
            <MenuItem>
              <UI.Link
                href="https://docs.google.com/forms/d/e/1FAIpQLSfdbtDe9SsFyHJD5wFg4cHc91qf7GsSLydH2wsK4xnwffQwjQ/viewform?usp=sf_link"
                isExternal={true}
              >
                {t('不具合のフィードバック')}
              </UI.Link>
            </MenuItem>
            <MenuItem onClick={app.signOut}>Logout</MenuItem>
          </UI.MenuList>
        </UI.Menu>
      ) : (
        <UI.Button
          variant="outline"
          colorScheme="blackAlpha"
          onClick={app.signIn}
        >
          Login
        </UI.Button>
      )}
      <UI.Select
        width={'7em'}
        size="sm"
        value={i18n.language}
        onChange={(e) => {
          console.log(e.target.value);
          i18n.changeLanguage(e.target.value);
        }}
      >
        <option value="en">{t('English')}</option>
        <option value="ja">{t('日本語')}</option>
      </UI.Select>
    </>
  );
};

export const Header: React.FC = () => {
  console.log('[Header]');
  return (
    <UI.Flex w="100%" h={16} backgroundColor="gray.200">
      <UI.Container w="100%" justify="space-between" align="center">
        <Link href="/">
          <a>
            <UI.Heading size="sm">Vivliostyle Pub</UI.Heading>
          </a>
        </Link>
        <UI.Flex align="center">
          <HeaderUserInfo />
        </UI.Flex>
      </UI.Container>
    </UI.Flex>
  );
};
