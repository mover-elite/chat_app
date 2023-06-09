import { createContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAccessToken } from "./login";
import axios from "axios";
import { toast } from "react-toastify";
import { url, websocker_url } from "../config";
export const TestContext = createContext();

export const ContextProvider = ({ children }) => {
  const navigator = useNavigate();
  const [user, setUser] = useState();
  const [friends, setFriends] = useState([]);
  const [websocket, setWebsocket] = useState(null);
  const [activeChat, setActiveChat] = useState(null);
  const [chatMessages, setChatMessages] = useState({});

  useEffect(() => {
    console.log("Chat messages changed");
  }, [chatMessages]);

  useEffect(() => {
    let ws = retrieveUser();
    return () => {
      ws.close();
    };
  }, []);

  const handleNewMessage = (event) => {
    let data = JSON.parse(event.data);
    if (data.state) {
      toast.success(`${data.username} is ${data.state}`, {
        position: toast.POSITION.BOTTOM_CENTER,
      });
      return;
    }
    console.log(data);
    console.log(friends);
    let sender = friends.filter((friend) => friend.id == data.chat_id);
    if (sender && user) {
      sender =
        sender[0].user_username == user.username
          ? sender[0].friend_username
          : sender[0].user_username;
      console.log(sender);
      console.log(user);
    }
    chatMessages[data.chat_id].push(data);

    setChatMessages({ ...chatMessages });
  };
  const retrieveUser = () => {
    const accessToken = getAccessToken();
    if (!accessToken) navigator("/login");
    try {
      axios
        .get(`${url}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })
        .then((res) => {
          setUser(res.data.user);
          setFriends(res.data.friends);
        });

      const ws = new WebSocket(
        `${websocker_url}/api/ws?access_token=${accessToken}`
      );
      ws.onopen = function (e) {};
      ws.onclose = function (e) {};
      ws.onmessage = handleNewMessage;
      setWebsocket(ws);
      return ws;
    } catch (e) {
      console.log(e);
      let errMsg = e.response.data.detail;
      if (errMsg == "Could not validate credentials") {
        navigator("/login");
      }
    }
  };

  const sendMessageToChat = async (content, chat) => {
    const accessToken = getAccessToken();
    let chatId = chat.id;

    const receiver =
      user.username == chat.user_username
        ? chat.friend_username
        : chat.user_username;

    try {
      const res = await axios.post(
        `${url}/api/message/add`,
        { chatId, content, receiver },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      let copymessages = { ...chatMessages };
      copymessages[chatId].push(res.data);

      setChatMessages({ ...copymessages });
    } catch (e) {
      console.log(e);
    }
  };

  const getChatMessages = async (chatId) => {
    let chatMsgs = chatMessages[chatId];
    if (!chatMsgs || chatMsgs.length === 0) {
      let newMSgs = await fetchChatMessages(chatId);
      if (!newMSgs) {
        return [];
      }
      chatMessages[chatId] = newMSgs;
      return newMSgs;
    } else {
      return chatMsgs;
    }
  };
  const fetchChatMessages = async (chatId) => {
    console.log("Fetching New Messages");
    const accessToken = getAccessToken();
    try {
      const res = await axios.get(`${url}/api/message/?chat_id=${chatId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return res.data;
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <TestContext.Provider
      value={{
        chatMessages,
        retrieveUser,
        user,
        friends,
        sendMessageToChat,
        setActiveChat,
        activeChat,
        getChatMessages,
      }}
    >
      {children}
    </TestContext.Provider>
  );
};
