import {Flex, FlexProps, Input, FormControl, FormLabel, InputGroup, InputLeftElement, FormErrorMessage, Code, Icon} from '@chakra-ui/react';

export {
  Box,
  Button,
  Flex,
  Grid,
  Heading,
  Icon,
  Image,
  Input,
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
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  InputGroup,
  InputLeftElement,
  Select,
  Alert,
  Stack,
  AlertIcon,
  Spacer
} from '@chakra-ui/react';


export const Container = (props: FlexProps) => (
  <Flex maxW={1080} m="0 auto" px={4} {...props} />
);
