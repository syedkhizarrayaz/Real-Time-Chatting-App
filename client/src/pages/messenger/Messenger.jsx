import "./messenger.css";
import Topbar from "../../components/topbar/Topbar";
import Conversation from "../../components/conversations/Conversation";
import Message from "../../components/message/Message";
import ChatOnline from "../../components/chatOnline/ChatOnline";
import { useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import axios from "axios";
import { io } from "socket.io-client";

export default function Messenger() {
  // conversation state
  const [conversations, setConversations] = useState([]);
  // chat opened state
  const [currentChat, setCurrentChat] = useState(null);
  // message state
  const [messages, setMessages] = useState([]);
  // new message state
  const [newMessage, setNewMessage] = useState("");
  // coming matches state
  const [arrivalMessage, setArrivalMessage] = useState(null);
  // online users state
  const [onlineUsers, setOnlineUsers] = useState([]);
  // socket call
  const socket = useRef();
  // check for user login
  const { user } = useContext(AuthContext);
  // automatically scroll to new message
  const scrollRef = useRef();
  // initiate socket connection to get messages
  useEffect(() => {
    socket.current = io("ws://localhost:8900");
    socket.current.on("getMessage", (data) => {
      // update arrival message state
      setArrivalMessage({
        sender: data.senderId,
        text: data.text,
        createdAt: Date.now(),
      });
    });
  }, []);
  // arrival message state effect
  useEffect(() => {
    arrivalMessage &&
      currentChat?.members.includes(arrivalMessage.sender) &&
      // see message on the related chat only
      setMessages((prev) => [...prev, arrivalMessage]);
  }, [arrivalMessage, currentChat]);
  // add user to socket user array
  useEffect(() => {
    socket.current.emit("addUser", user._id);
    // get users online
    socket.current.on("getUsers", (users) => {
      setOnlineUsers(
        user.followings.filter((f) => users.some((u) => u.userId === f))
      );
    });
  }, [user]);

  useEffect(() => {
    // get user conversations
    const getConversations = async () => {
      try {
        // set conversation state after fetching it
        const res = await axios.get("/conversations/" + user._id);
        setConversations(res.data);
      } catch (err) {
        console.log(err);
      }
    };
    getConversations();
  }, [user._id]);
  // get messages
  useEffect(() => {
    const getMessages = async () => {
      try {
        // fetch messages of current conversation
        const res = await axios.get("/messages/" + currentChat?._id);
        setMessages(res.data);
      } catch (err) {
        console.log(err);
      }
    };
    getMessages();
  }, [currentChat]);

  // sending text button
  const handleSubmit = async (e) => {
    e.preventDefault();
    const message = {
      sender: user._id,
      text: newMessage,
      conversationId: currentChat._id,
    };
    // get receiver id
    const receiverId = currentChat.members.find(
      (member) => member !== user._id
    );
      // send message using socket
    socket.current.emit("sendMessage", {
      senderId: user._id,
      receiverId,
      text: newMessage,
    });

    try {
      // send message
      const res = await axios.post("/messages", message);
      // change message state
      setMessages([...messages, res.data]);
      setNewMessage("");
    } catch (err) {
      console.log(err);
    }
  };

  // effect for scrolling to new message
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <>
    {/* top bar component*/}
      <Topbar />
      <div className="messenger">
        {/* top bar menu */}
        <div className="chatMenu">
          <div className="chatMenuWrapper">
            {/* search holder */}
            <input placeholder="Search for friends" className="chatMenuInput" />
            {/* conversations box */}
            {/* map conversations started */}
            {conversations.map((c) => (
              <div onClick={() => setCurrentChat(c)}>
                <Conversation conversation={c} currentUser={user} />
              </div>
            ))}
          </div>
        </div>
        {/* chat box */}
        <div className="chatBox">
          <div className="chatBoxWrapper">
            {currentChat ? (
              <>
              {/* top part of chat box */}
                <div className="chatBoxTop">
                  {/* map messages using user id */}
                  {messages.map((m) => (
                    <div ref={scrollRef}>
                      <Message message={m} own={m.sender === user._id} />
                    </div>
                  ))}
                </div>
                {/* bottom part of chat box */}
                <div className="chatBoxBottom">
                  {/* update message using event */}
                  <textarea
                    className="chatMessageInput"
                    placeholder="write something..."
                    onChange={(e) => setNewMessage(e.target.value)}
                    value={newMessage}
                  ></textarea>
                  {/* send message button */}
                  <button className="chatSubmitButton" onClick={handleSubmit}>
                    Send
                  </button>
                </div>
              </>
            ) : (
              <span className="noConversationText">
                Enjoy Chatting!
              </span>
            )}
          </div>
        </div>
        {/* online friends */}
        <div className="chatOnline">
          <div className="chatOnlineWrapper">
            <ChatOnline
              onlineUsers={onlineUsers}
              currentId={user._id}
              setCurrentChat={setCurrentChat}
            />
          </div>
        </div>
      </div>
    </>
  );
}
