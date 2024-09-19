import React from "react";
import Button from "../Button";

const DeleteChatLink = ({ handleDeleteLink }: any) => {
  const deleteHandler = async () => {
    if (window.confirm("Delete chat link forever?")) await handleDeleteLink();
  };
  return (
    <div>
      <Button  onClick={deleteHandler} label = "Delete" type="secondary"/>
    </div>
  )
}

export default DeleteChatLink;
