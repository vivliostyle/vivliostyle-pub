import {FC} from 'react';
import Editor from '@monaco-editor/react';
import {Box, Spinner} from '@chakra-ui/react';
import {OnModified, useMarkdownEditor} from './hooks';

export const MarkdownEditor: FC<{onModified?: OnModified}> = ({
  onModified = () => {},
}) => {
  const {language, display, fileState, onChange, handleEditorDidMount} =
    useMarkdownEditor(onModified);

  return (
    <Box w="100%" h="100%" position="relative" overflow="hidden">
      <Editor
        height="100%"
        language={language}
        path={fileState.file?.name}
        options={{
          minimap: {enabled: false},
          wordWrap: 'on',
          wrappingStrategy: 'advanced',
        }}
        onChange={onChange}
        value={fileState.text}
        onMount={handleEditorDidMount}
      />
      <Box
        display={display}
        position="absolute"
        w="100%"
        h="100%"
        top="0"
        left="0"
        textAlign="center"
        verticalAlign="center"
        backgroundColor="rgb(0,0,0,0.5)"
        lineHeight="100%"
      >
        {fileState.file == null ? null : (
          <Spinner
            size="xl"
            emptyColor="gray.200"
            color="blue.500"
            mt="calc(50% - 3rem)"
          />
        )}
      </Box>
    </Box>
  );
};
