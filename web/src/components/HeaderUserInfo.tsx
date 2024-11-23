import {FC} from 'react';
import {useTranslation} from 'react-i18next';
import {ChevronDownIcon} from '@chakra-ui/icons';
import {
  Button,
  Image,
  Link,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Select,
} from '@chakra-ui/react';
import {useHeaderUserInfo} from './hooks';

export const HeaderUserInfo: FC = () => {
  const {user, signIn, signOut} = useHeaderUserInfo();
  const {t, i18n} = useTranslation();

  return (
    <>
      {user ? (
        <Menu>
          <MenuButton as={Button} rightIcon={<ChevronDownIcon />}>
            {user.displayName}
          </MenuButton>
          <MenuList>
            <MenuItem>
              <Link
                href="https://docs.google.com/forms/d/e/1FAIpQLSeh_7rm4RbwKRSHsEXexC4-PBZGK4JJFyQrW_Ee5JGUJHoB5w/viewform?usp=sf_link"
                isExternal={true}
              >
                {t('利用者アンケート')}
              </Link>
            </MenuItem>
            <MenuItem>
              <Link
                href="https://docs.google.com/forms/d/e/1FAIpQLSfdbtDe9SsFyHJD5wFg4cHc91qf7GsSLydH2wsK4xnwffQwjQ/viewform?usp=sf_link"
                isExternal={true}
              >
                {t('不具合のフィードバック')}
              </Link>
            </MenuItem>
            <MenuItem onClick={signOut}>Logout</MenuItem>
          </MenuList>
        </Menu>
      ) : (
        <>
          <Button variant="outline" colorScheme="blackAlpha" onClick={signIn}>
            Login
          </Button>
          <Link
            href="https://vercel.com/?utm_source=vivliostyle&amp;utm_campaign=oss"
            isExternal={true}
            style={{position: 'fixed', bottom: 0, right: 0}}
          >
            <Image
              src="https://www.datocms-assets.com/31049/1618983297-powered-by-vercel.svg"
              alt="Powered By Vercel"
            />
          </Link>
        </>
      )}
      <Select
        width={'7em'}
        size="sm"
        value={i18n.language}
        onChange={(e) => {
          console.log(e.target.value);
          i18n.changeLanguage(e.target.value);
        }}
      >
        <option value="en">{t('English')}</option>
        <option value="ja">{t('日本語')}</option>
      </Select>
      <Link
        href={t('URL-vivliostyle-pub-user-guide')}
        isExternal={true}
        marginInlineStart={'1em'}
      >
        {t('ユーザーガイド')}
      </Link>
    </>
  );
};
