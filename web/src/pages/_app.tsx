import React from 'react';
import {AppProps} from 'next/app';
import {ChakraProvider, CSSReset} from '@chakra-ui/react';
import {PreviewSourceContextProvider} from '@middlewares/usePreviewSourceContext';
import {AppContextProvider} from '@middlewares/useAppContext';

const MyApp = ({Component, pageProps}: AppProps) => (
  <ChakraProvider>
    <CSSReset />
    <AppContextProvider>
      <PreviewSourceContextProvider>
        <Component {...pageProps} />
      </PreviewSourceContextProvider>
    </AppContextProvider>
  </ChakraProvider>
);

export default MyApp;
