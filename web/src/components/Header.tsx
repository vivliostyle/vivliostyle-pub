import React from 'react';
import Link from 'next/link';
import {Container, Flex, Heading} from '@chakra-ui/react';
import {HeaderUserInfo} from './HeaderUserInfo';

export const Header: React.FC = () => {
  console.log('[Header]');
  return (
    <Flex w="100%" h={16} backgroundColor="gray.200">
      <Container w="100%" justify="space-between" align="center">
        <Link href="/">
          <a>
            <Heading size="sm">Vivliostyle Pub</Heading>
          </a>
        </Link>
        <Flex align="center">
          <HeaderUserInfo />
        </Flex>
      </Container>
    </Flex>
  );
};
