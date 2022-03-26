import React from 'react';
import {AppProps} from 'next/app';
import {ChakraProvider, CSSReset} from '@chakra-ui/react';
import {AppContextProvider} from '@middlewares/contexts/useAppContext';
import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import enJson from '../locales/en/translation.json';
import jaJson from '../locales/ja/translation.json';
import {devConsole} from '@middlewares/frontendFunctions';
import {LogContextProvider} from '@middlewares/contexts/useLogContext';

const {_log, _err} = devConsole('[MyApp]');

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {translation: enJson},
      ja: {translation: jaJson},
    },
    fallbackLng: 'en',
    interpolation: {escapeValue: false},
  });

import '../styles/styles.css';

const MyApp = ({Component, pageProps}: AppProps) => {
  _log(Component, pageProps);
  return (
    <ChakraProvider>
      <CSSReset />
      <LogContextProvider>
        <AppContextProvider>
          <Component {...pageProps} />
        </AppContextProvider>
      </LogContextProvider>
    </ChakraProvider>
  );
};

export default MyApp;
