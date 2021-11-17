import React from 'react';
import { AppProps } from 'next/app';
import { ChakraProvider, CSSReset } from '@chakra-ui/react';
// import { ModifiedTextProvider } from '@middlewares/useModifiedTextContext';
import { RepositoryContextProvider } from '@middlewares/useRepositoryContext';
import { PreviewSourceContextProvider } from '@middlewares/usePreviewSourceContext';


const MyApp = ({ Component, pageProps }: AppProps) => (
  <ChakraProvider>
    <CSSReset />
    <RepositoryContextProvider>
    {/* <ModifiedTextProvider> */}
      <PreviewSourceContextProvider>
    <Component {...pageProps} />
    </PreviewSourceContextProvider>
    {/* </ModifiedTextProvider> */}
    </RepositoryContextProvider>
  </ChakraProvider>
);

export default MyApp;
