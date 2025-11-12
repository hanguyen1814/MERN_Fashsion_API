exports.genOrderCode = () => {
  const yyyy = new Date().getFullYear();
  const rnd = Math.floor(Math.random() * 1e6)
    .toString()
    .padStart(6, "0");
  return `FSH-${yyyy}-${rnd}`;
};
