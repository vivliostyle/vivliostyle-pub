import {useCallback, useMemo, useState} from 'react';
import {useRepositoryContext} from '@middlewares/contexts/useRepositoryContext';
import upath from 'upath';
import {VFile} from 'theme-manager';
import {
  getFileContentFromGithub,
  isImageFile,
} from '@middlewares/frontendFunctions';
import {useAppContext} from '@middlewares/contexts/useAppContext';
import {useDisclosure} from '@chakra-ui/react';
import {useLogContext} from '@middlewares/contexts/useLogContext';
import {t} from 'i18next';
import {useCurrentFileContext} from '@middlewares/contexts/useCurrentFileContext';

export const useProjectExplorer = () => {
  console.log('[Project Explorer]');
  const app = useAppContext();
  const repository = useRepositoryContext();
  const currentFile = useCurrentFileContext();
  const log = useLogContext();

  const {
    isOpen: isOpenFileUploadModal,
    onOpen: onOpenFileUploadModal,
    onClose: onCloseFileUploadModal,
  } = useDisclosure();

  // 絞り込みキーワード
  const [filenamesFilterText, setFilenamesFilterText] = useState('');

  // ファイル名入力フォームの表示フラグ 種別兼用 'file':新規ファイル,'dir':新規ディレクトリ,null:非表示
  const [createForm, setCreateForm] = useState<'file' | 'dir' | null>(null);

  // ライトボックスの表示フラグ
  const [lightBoxContent, setLightBoxContent] = useState<{
    file: VFile;
    data: string;
  } | null>(null); // ライトボックスに表示する画像

  // 絞り込み後のファイルリスト
  const filteredFiles = useMemo(() => {
    // console.log('proj.files',repository.state.files);
    return repository.state.files.filter((f) =>
      f.name.includes(filenamesFilterText),
    );
  }, [repository.state.files, filenamesFilterText]);

  // 表示用のカレントディレクトリ
  const currentDir = useMemo(() => {
    console.log('change currentDir');
    let path = repository.state.currentTree.map((f) => f.name).join('/');
    // 長すぎるパスは省略
    if (path.length > 15) {
      path = '...' + path.slice(-15);
    }
    return path;
  }, [repository.state.currentTree]);

  /**
   * ファイルまたはディレクトリが選択された
   * blob,treeはGit用語
   * @param file
   */
  const onClick = async (file: VFile) => {
    setCreateForm(null);

    if (file.type === 'file') {
      // 画像ファイルだったらライトボックスで表示する
      if (isImageFile(file.name)) {
        const srcPath = upath.join(currentDir, file.name);

        // PreviewのiframeにしかServiceWorkerが設定されていないため Application Cacheにアクセスできないので
        // 代替手段としてDataURIを使用している
        // TODO: このページからはApplication Cacheにアクセスできるようにする
        let content = await getFileContentFromGithub(
          repository.state.owner!,
          repository.state.repo!,
          repository.state.branch!,
          srcPath,
          app.state.user!,
        );
        if (!content) {
          log.error(
            t('ファイルの取得に失敗しました。GitHubで確認してください。', {
              filepath: srcPath,
            }),
            3000,
          );
          return;
        }
        let type = '';
        const ext = upath.extname(file.name).toLowerCase();
        if (ext === '.jpg' || ext === '.jpeg') {
          type = 'jpeg;base64,';
        } else if (ext === '.png') {
          type = 'png;base64,';
        } else if (ext === '.gif') {
          type = 'gif;base64,';
        } else if (ext === '.svg') {
          type = 'svg+xml,';
          content = encodeURIComponent(content);
        } else {
          log.error(t('不明な画像ファイル形式です', {fileptah: srcPath}), 3000);
          return;
        }
        const data = content ? `data:image/${type}${content}` : '';
        setLightBoxContent({file, data});
        return;
      }
      // 画像でなければエディタで編集できるよう選択する
      repository.selectFile(file);
    } else if (file.type === 'dir') {
      // ディレクトリ
      repository.selectTree(file);
    }
  };

  /**
   * リポジトリからファイルリストを取得しなおす
   * 複数のコンポーネントから呼び出されるので独立したコールバックメソッドとして定義
   * TODO: GitHubのリポジトリに直接変更を加えた場合にリロードしてもらうようマニュアルに追加
   */
  const reload = useCallback(async () => {
    console.log('ProjectExplorer reload', currentDir);
    repository.selectTree('.');
  }, [repository, currentDir]);

  const createFileOrDirectory = (e: any) => {
    const name = e.target.value;
    if (!name || name.length === 0) {
      setCreateForm(null);
      return;
    }
    if (createForm === 'file') {
      repository.createFile(
        upath.join(currentDir, name),
        new File(['\n'], name),
      );
    } else if (createForm === 'dir') {
      const filePath = upath.join(currentDir, name, '.gitkeep');
      repository.createFile(filePath, new File(['\n'], '.gitkeep'));
    }
    setCreateForm(null);
  };

  /**
   * リンクタグの埋め込み
   * @param name ディレクトリ名を含まないファイル名 TODO: VFileオブジェクトのほうが良いかも
   */
  const handleEmbedLink = useCallback(
    (file: VFile) => {
      if (currentFile.state.file) {
        const editingPath = upath.dirname(currentFile.state.file.path);
        currentFile.insert(
          `[${upath.trimExt(file.name)}](${upath.relative(
            editingPath,
            file.path,
          )})`,
        );
      }
    },
    [currentFile],
  );

  /**
   * 画像タグの埋め込み
   * @param file 画像ファイル
   */
  const handleEmbedImage = useCallback(
    (file: VFile) => {
      if (currentFile.state.file) {
        console.log('embedImage', file.path, currentFile.state.file?.path);
        const editingPath = upath.dirname(currentFile.state.file.path);
        currentFile.insert(
          `![Fig. ${file.name}](${upath.relative(editingPath, file.path)})`,
        );
      }
    },
    [currentFile],
  );

  return {
    appState: app.state,
    repository,
    setCreateForm,
    isOpenFileUploadModal,
    onOpenFileUploadModal,
    onCloseFileUploadModal,
    reload,
    lightBoxContent,
    setLightBoxContent,
    handleEmbedImage,
    handleEmbedLink,
    filenamesFilterText,
    setFilenamesFilterText,
    currentDir,
    createForm,
    createFileOrDirectory,
    filteredFiles,
    onClickFileEntry: onClick,
  };
};
