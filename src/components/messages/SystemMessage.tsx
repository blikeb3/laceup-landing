import { Message } from "@/types/messages";

type SystemMessageProps = {
  message: Message;
};

export const SystemMessage = ({ message }: SystemMessageProps) => {
  return (
    <div className="flex justify-center my-4">
      <div className="bg-muted px-3 py-1.5 rounded-full">
        <p className="text-xs text-muted-foreground text-center">
          {message.text}
        </p>
      </div>
    </div>
  );
};
