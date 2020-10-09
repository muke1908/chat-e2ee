const uniqueSequence = (n) => {
  var sequence = [];
  var check = [];

  for (let i = 0; i < n; i++) {
    check[i] = 0;
  }

  for (let i = 0; i < n; i++) {
    sequence[i] = Math.floor(Math.random() * n + 1);
    if (check[sequence[i]] === 1) {
      i--;
    }
    check[sequence[i]] = 1;
  }

  return sequence;
};

export default uniqueSequence;
