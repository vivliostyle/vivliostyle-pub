import {memo, FC} from 'react';
import {useMarkdownPreviewer} from './hooks';

export const MarkdownPreviewer: FC = () => {
  const {iframeRef} = useMarkdownPreviewer();

  return <ViewerFrame iframeRef={iframeRef} />;
};

// iframeを作りなおすとページが先頭に戻ってしまうため、無駄なレンダリングを防ぐためにメモ化する
type ViewerFrameProps = {iframeRef: any};
const ViewerFrame = memo<ViewerFrameProps>(function useViewerFrame({
  iframeRef,
}) {
  return <iframe ref={iframeRef} width="100%" height="100%"></iframe>;
});
