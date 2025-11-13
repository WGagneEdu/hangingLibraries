export default function handler(req, res) {
  res.status(200).json({
    books: [
      { title: "Example Book 1" },
      { title: "Example Book 2" }
    ]
  });
}
