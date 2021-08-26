import React from 'react';
import { AppProps } from 'next/app';
import { ChakraProvider, CSSReset } from '@chakra-ui/react';

const MyApp = ({ Component, pageProps }: AppProps) => (
  <ChakraProvider>
    <CSSReset />
    <Component {...pageProps} />
  </ChakraProvider>
);

export default MyApp;
