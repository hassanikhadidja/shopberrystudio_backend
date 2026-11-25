const Message = require("../models/message");

const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;

function toFrontend(msg) {
  const m = msg.toObject ? msg.toObject() : msg;
  return {
    f: m.from,
    t: m.text,
    ts: new Date(m.createdAt || Date.now()).getTime(),
    _id: m._id,
  };
}

exports.GetMessages = async (req, res) => {
  try {
    const cutoff = new Date(Date.now() - THREE_DAYS);
    let messages = await Message.find({
      userId: req.user._id,
      createdAt: { $gte: cutoff },
    }).sort({ createdAt: 1 });

    if (!messages.length) {
      const welcome = new Message({
        userId: req.user._id,
        from: "o",
        text: "Hi! Welcome to Berry Studio. Ask me anything about our printables.",
      });
      await welcome.save();
      messages = [welcome];
    }

    return res.status(200).json(messages.map(toFrontend));
  } catch (error) {
    return res.status(503).json({ msg: error.message });
  }
};

exports.SendMessage = async (req, res) => {
  try {
    const text = String(req.body.text ?? req.body.t ?? "").trim();
    if (!text) return res.status(400).json({ msg: "Message text is required" });

    const message = new Message({
      userId: req.user._id,
      from: "u",
      text,
    });
    await message.save();
    return res.status(201).json({
      msg: "Sent. Expect a reply in about 2 hours",
      message: toFrontend(message),
    });
  } catch (error) {
    return res.status(503).json({ msg: error.message });
  }
};
