import React from 'react';
import { AppProps } from 'next/app';
import { ChakraProvider, CSSReset } from '@chakra-ui/react';
import { ModifiedTextProvider } from '@middlewares/useModifiedTextContext';
import { RepositoryContextProvider } from '@middlewares/useRepositoryContext';


const MyApp = ({ Component, pageProps }: AppProps) => (
  <ChakraProvider>
    <CSSReset />
    <RepositoryContextProvider>
    <ModifiedTextProvider>
    <Component {...pageProps} />
    </ModifiedTextProvider>
    </RepositoryContextProvider>
  </ChakraProvider>
);

export default MyApp;
