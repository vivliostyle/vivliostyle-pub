import React from 'react';
import Link from 'next/link';
import * as UI from './ui';
import {AppContext, useAppContext} from '@middlewares/contexts/useAppContext';
import {useTranslation} from 'react-i18next';
import {devConsole} from '@middlewares/frontendFunctions';

const {_log, _err} = devConsole('[Header]');

const HeaderUserInfo = React.memo(function useHeaderUserInfo(props: {
  app: AppContext;
}) {
  _log('user', props.app.state.user);
  const {t, i18n} = useTranslation();

  return (
    <>
      {props.app.state.user ? (
        <>
          <UI.Text mr={2} fontSize={'small'}>
            <UI.Link
              href="https://docs.google.com/forms/d/e/1FAIpQLSeh_7rm4RbwKRSHsEXexC4-PBZGK4JJFyQrW_Ee5JGUJHoB5w/viewform?usp=sf_link"
              isExternal={true}
            >
              {t('利用者アンケート')}
            </UI.Link>
          </UI.Text>
          <UI.Text mr={2} fontSize={'small'}>
            <UI.Link
              href="https://docs.google.com/forms/d/e/1FAIpQLSfdbtDe9SsFyHJD5wFg4cHc91qf7GsSLydH2wsK4xnwffQwjQ/viewform?usp=sf_link"
              isExternal={true}
            >
              {t('不具合のフィードバック')}
            </UI.Link>
          </UI.Text>
          <UI.Text mr={2}>
            logged in as {props.app.state.user.displayName}
          </UI.Text>
          <UI.Button
            variant="outline"
            colorScheme="blackAlpha"
            onClick={props.app.signOut}
          >
            Logout
          </UI.Button>
        </>
      ) : (
        <UI.Button
          variant="outline"
          colorScheme="blackAlpha"
          onClick={props.app.signIn}
        >
          Login
        </UI.Button>
      )}
      <UI.Select
        width={'7em'}
        size="sm"
        value={i18n.language}
        onChange={(e) => {
          _log(e.target.value);
          i18n.changeLanguage(e.target.value);
        }}
      >
        <option value="en">{t('English')}</option>
        <option value="ja">{t('日本語')}</option>
      </UI.Select>
    </>
  );
});

export const Header: React.FC = () => {
  const app = useAppContext();
  _log('', app.state);

  return (
    <UI.Flex w="100%" h={16} backgroundColor="gray.200">
      <UI.Container w="100%" justify="space-between" align="center">
        <Link href="/">
          <a>
            <UI.Heading size="sm">Vivliostyle Pub</UI.Heading>
          </a>
        </Link>
        <UI.Flex align="center">
          <HeaderUserInfo app={app} />
        </UI.Flex>
      </UI.Container>
    </UI.Flex>
  );
};
