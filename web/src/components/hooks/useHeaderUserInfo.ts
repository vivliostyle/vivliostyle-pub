import {useAppContext} from '@middlewares/contexts/useAppContext';

export const useHeaderUserInfo = () => {
  const app = useAppContext();
  console.log('user', app.state.user);

  return {
    user: app.state.user,
    signIn: app.signIn,
    signOut: app.signOut,
  };
};
