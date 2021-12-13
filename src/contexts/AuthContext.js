import React, {
    createContext,
    useEffect,
    useReducer
  } from 'react';
  import jwtDecode from 'jwt-decode';
  import LoadingScreen from '../components/LoadingScreen';
  import axios from '../utils/axios';
  import { LoginService } from '../services/Http/LoginService';
  import { handleResponse } from '../utils/responseHandler';
  import {SESSION_KEY} from '../common/Constants'
  const initialAuthState = {
    isAuthenticated: false,
    isInitialised: false,
    user: null
  };
  
  const isValidToken = (accessToken) => {
    console.log(accessToken)
    if (!accessToken) {
      return false;
    }
    const decoded = jwtDecode(accessToken);
    const currentTime = Date.now() / 1000;
    return decoded.exp > currentTime;
  };
  
  const setSession = (accessToken) => {
    if (accessToken) {
      localStorage.setItem('accessToken', accessToken);
      axios.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
    } else {
      localStorage.removeItem('accessToken');
      delete axios.defaults.headers.common.Authorization;
    }
  };
  const setSessionData = (data) => {
    if (data) {
      console.log('user data saved', data)
      localStorage.setItem(SESSION_KEY, JSON.stringify(data));
      axios.defaults.headers.common.Authorization = `Bearer ${data.token}`;
    } else {
      console.log('remove userData')
      localStorage.removeItem(SESSION_KEY);
      delete axios.defaults.headers.common.Authorization;
    }
  };
  const reducer = (state, action) => {
  
    switch (action.type) {
      case 'INITIALISE': {
        const { isAuthenticated, user } = action.payload;
  
        return {
          ...state,
          isAuthenticated,
          isInitialised: true,
          user
        };
      }
      case 'LOGIN': {
        const { data } = action.payload;
        const user = data;
        console.log('in login reducer, user fetched is: ' )
        console.log(data,user)
        return {
          ...state,
          isAuthenticated: true,
          user
        };
      }
      case 'LOGOUT': {
        return {
          ...state,
          isAuthenticated: false,
          user: null
        };
      }
    
      case 'ERROR': {
        const errorMSG = action.payload;
  
        return {
          ...state,
          isAuthenticated: false,
          errorMSG
        };
      }
      default: {
        return { ...state };
      }
    }
  };
  
  const AuthContext = createContext({
    ...initialAuthState,
    method: 'JWT',
    login: () => Promise.resolve(),
    logout: () => { }
  });
  
  export const AuthProvider = ({ children }) => {
    const [state, dispatch] = useReducer(reducer, initialAuthState);
  
    const login = async (email, password) => {
      
      
       const response = await (new LoginService).login({email,password});
      console.log('response is',response)
      if(!response.data)
           return response
      const { data } = response.data;
      // origin
      setSessionData(data)
      // setSession(data);
      console.log('after set session data,',data)
      dispatch({
        type: 'LOGIN',
        payload: {
          data
        }
      });
    
      
       return response;
      
      
  
     
    };
  
    const logout = () => {
      setSessionData(null);
      dispatch({ type: 'LOGOUT' });
    };
  
    
    useEffect(() => {
      const initialise = async () => {
        try {
          console.log('try to load userData from localstaorage')
          // const accessToken = window.localStorage.getItem('accessToken');
          let user = window.localStorage.getItem(SESSION_KEY);
          if(user)
          {
            user = JSON.parse(user);
          }
          console.log(user)
          if (user && user.token && isValidToken(user.token)) {
            setSessionData(user);
            dispatch({
              type: 'INITIALISE',
              payload: {
                isAuthenticated: true,
                user
              }
            });
          } else {
            console.log('user data not found or expired')
            dispatch({
              type: 'INITIALISE',
              payload: {
                isAuthenticated: false,
                user: null
              }
            });
          }
        } catch (err) {
          let resp = handleResponse(err)
          dispatch({
            type: 'INITIALISE',
            payload: {
              isAuthenticated: false,
              user: null
            }
          });
        }
      };
  
      initialise();
    }, []);
    if (!state.isInitialised) {
      return <LoadingScreen />;
    }
  
    return (
      <AuthContext.Provider
        value={{
          ...state,
          method: 'JWT',
          login,
          logout
          // ,
          // register
        }}
      >
        {children}
      </AuthContext.Provider>
    );
  };
  
  export default AuthContext;