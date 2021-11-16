import React from 'react';
import { AppProps } from 'next/app';
import { ChakraProvider, CSSReset } from '@chakra-ui/react';
// import { ModifiedTextProvider } from '@middlewares/useModifiedTextContext';
import { RepositoryContextProvider } from '@middlewares/useRepositoryContext';
import { PreviewTargetContextProvider } from '@middlewares/usePreviewTarget';


const MyApp = ({ Component, pageProps }: AppProps) => (
  <ChakraProvider>
    <CSSReset />
    <RepositoryContextProvider>
    {/* <ModifiedTextProvider> */}
      <PreviewTargetContextProvider>
    <Component {...pageProps} />
    </PreviewTargetContextProvider>
    {/* </ModifiedTextProvider> */}
    </RepositoryContextProvider>
  </ChakraProvider>
);

export default MyApp;
