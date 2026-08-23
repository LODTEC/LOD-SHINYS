exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Método não permitido" }) };
  }

  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "MP_ACCESS_TOKEN não configurado no site (Site settings > Environment variables)." }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { pokemonId, nome, preco, email, orderId } = body;

    if (!pokemonId || !preco || !email || !orderId) {
      return { statusCode: 400, body: JSON.stringify({ error: "Dados incompletos para gerar o Pix." }) };
    }

    const resp = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-Idempotency-Key": String(orderId),
      },
      body: JSON.stringify({
        transaction_amount: Number(preco),
        description: `Pokémon shiny: ${nome}`,
        payment_method_id: "pix",
        payer: { email },
        external_reference: String(pokemonId),
      }),
    });

    const data = await resp.json();

    if (!resp.ok) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: data.message || "Erro ao gerar o Pix no Mercado Pago.", details: data }),
      };
    }

    const txData = data.point_of_interaction && data.point_of_interaction.transaction_data;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentId: data.id,
        qrCodeBase64: txData ? txData.qr_code_base64 : null,
        qrCodeText: txData ? txData.qr_code : null,
      }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
