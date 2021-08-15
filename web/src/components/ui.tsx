import React from 'react';
import {Flex, FlexProps} from '@chakra-ui/core';

export {
  Box,
  Button,
  Flex,
  Grid,
  Heading,
  Icon,
  Image,
  Link,
  Text,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuGroup,
  MenuDivider,
  Spinner,
  ButtonGroup,
} from '@chakra-ui/core';

export const Container = (props: FlexProps) => (
  <Flex maxW={1080} m="0 auto" px={4} {...props} />
);
