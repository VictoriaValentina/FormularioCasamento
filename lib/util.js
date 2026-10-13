import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY devem ser definidas no arquivo .env.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export const submitRSVP = async (formData) => {
  try {
    const { data, error } = await supabase.from("formulario").insert([
      {
        nome: formData.nome,
        sobrenome: formData.sobrenome,
        telefone: formData.telefone,
        igreja: formData.igreja,
        festa: formData.festa,
        crianca: formData.crianca,
        idade_crianca: formData.idade_crianca,
        qtd_crianca: formData.qtd_crianca,
        nome_crianca: formData.nome_crianca,
        recado: formData.recado,
      },
    ]);

    if (error) {
      if (error.code === "23505") {
        throw new Error(
          "Olá novamente! Parece que você já confirmou presença. Se deseja atualizar suas informações, entre em contato conosco.",
        );
      }

      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error("Erro ao enviar RSVP:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro inesperado ao enviar confirmação.",
    };
  }
};

export const checkRSVPExists = async (nome, sobrenome, telefone) => {
  try {
    const { data, error } = await supabase
      .from("formulario")
      .select("nome, sobrenome")
      .eq("telefone", telefone.trim());

    if (error) throw error;

    const normalize = (value) => value?.trim().toLocaleLowerCase("pt-BR");
    const exists = data?.some(
      (record) =>
        normalize(record.nome) === normalize(nome) &&
        normalize(record.sobrenome) === normalize(sobrenome),
    );

    return { success: true, exists: !!exists };
  } catch (error) {
    console.error("Erro ao verificar RSVP:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro inesperado ao verificar confirmação.",
    };
  }
};
