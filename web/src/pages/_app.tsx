import React from 'react';
import {AppProps} from 'next/app';
import {ChakraProvider, CSSReset} from '@chakra-ui/react';
import {AppContextProvider} from '@middlewares/contexts/useAppContext';
import {LogContextProvider} from '@middlewares/contexts/useLogContext';

import '../styles/styles.css';

const MyApp = ({Component, pageProps}: AppProps) => (
  <ChakraProvider>
    <CSSReset />
    <LogContextProvider>
      <AppContextProvider>
        <Component {...pageProps} />
      </AppContextProvider>
    </LogContextProvider>
  </ChakraProvider>
);

export default MyApp;
