import React from 'react';
import {Flex, FlexProps} from '@chakra-ui/core';

export {
  Box,
  Button,
  Flex,
  Grid,
  Heading,
  Image,
  Link,
  Text,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuGroup,
  MenuDivider,
} from '@chakra-ui/core';

export const Container = (props: FlexProps) => (
  <Flex maxW={1080} m="0 auto" px={4} {...props} />
);
