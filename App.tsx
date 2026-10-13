import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Animated,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
  Dimensions,
} from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { checkRSVPExists, submitRSVP } from "./lib/util";

const { height } = Dimensions.get("window");

const C = {
  vinho: "#7a1736",
  vinhoEscuro: "#5a0f27",
  azul: "#16265a",
  creme: "#fbf6ee",
  rosa: "#f1d3d6",
  text: "#2b2430",
  branco: "#ffffff",
  rosaClaro: "#fbeceb",
};

type RSVPFormData = {
  nome: string;
  sobrenome: string;
  telefone: string;
  vaiIgreja: "sim" | "nao";
  vaiFesta: "sim" | "nao";
  crianca: "sim" | "nao";
  idadesCriancas: string[];
  qtd: number;
  nomesCriancas: string[];
  recado: string;
};

const createInitialFormData = (): RSVPFormData => ({
  nome: "",
  sobrenome: "",
  telefone: "",
  vaiIgreja: "sim",
  vaiFesta: "sim",
  crianca: "sim",
  idadesCriancas: [],
  qtd: 0,
  nomesCriancas: [""],
  recado: "",
});

function Button({
  title,
  onPress,
  disabled = false,
  variant = "wine",
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "wine" | "blue" | "outline" | "white";
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      activeOpacity={disabled ? 1 : 0.82}
      disabled={disabled}
      style={[
        styles.button,
        variant === "blue" && styles.buttonBlue,
        variant === "outline" && styles.buttonOutline,
        variant === "white" && styles.buttonWhite,
        disabled && styles.buttonDisabled,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.buttonText,
          variant === "outline" && styles.buttonOutlineText,
          variant === "white" && styles.buttonWhiteText,
          disabled && styles.buttonDisabledText,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}
function Heading({
  kicker,
  children,
}: {
  kicker: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.heading}>
      <Text style={styles.kicker}>{kicker}</Text>
      <Text style={styles.sectionTitle}>{children}</Text>
      <Text style={styles.heart}>──── ♥ ────</Text>
    </View>
  );
}

function Reveal({
  scrollY,
  children,
  style,
}: {
  scrollY: number;
  children: React.ReactNode;
  style?: any;
}) {
  const [y, setY] = useState<number | null>(null);
  const [shown, setShown] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (shown || y === null) return;
    // dispara quando o topo do bloco entra nos 90% inferiores da tela
    if (scrollY + height * 0.9 > y) {
      setShown(true);
      Animated.timing(anim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }).start();
    }
  }, [scrollY, y, shown, anim]);

  return (
    <Animated.View
      onLayout={(e) => setY(e.nativeEvent.layout.y)}
      style={[
        style,
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [40, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

function Invitation() {
  const insets = useSafeAreaInsets();
  const [nome, setNome] = useState("");
  const [formData, setFormData] = useState<RSVPFormData>(createInitialFormData);
  const [scrollY, setScrollY] = useState(0);
  const [loading, setLoading] = useState(false);

  const sendConfirmation = async () => {
    if (!nome.trim()) {
      Alert.alert(
        "Falta seu nome",
        "Preencha seu nome completo para continuar.",
      );
      return;
    }

    if (!formData.sobrenome.trim()) {
      Alert.alert("Campo obrigatório", "Preencha seu sobrenome.");
      return;
    }

    if (!formData.telefone.trim()) {
      Alert.alert("Campo obrigatório", "Preencha seu telefone com DDD.");
      return;
    }

    const precisaInformacoesCriancas =
      formData.vaiFesta === "sim" && formData.crianca === "sim";

    if (precisaInformacoesCriancas && formData.qtd < 1) {
      Alert.alert("Campo obrigatório", "Informe quantas crianças você levará.");
      return;
    }

    if (
      precisaInformacoesCriancas &&
      formData.idadesCriancas.some((idade) => !idade.trim())
    ) {
      Alert.alert("Campo obrigatório", "Informe a idade de cada criança.");
      return;
    }

    if (
      precisaInformacoesCriancas &&
      formData.idadesCriancas.some((idade) => Number(idade) >= 8)
    ) {
      Alert.alert(
        "Cadastro individual",
        "Crianças com mais de 8 anos na data do casamento precisam ser cadastradas individualmente.",
      );
      return;
    }

    if (
      precisaInformacoesCriancas &&
      formData.nomesCriancas.slice(0, formData.qtd).some((nomeCrianca) => !nomeCrianca.trim())
    ) {
      Alert.alert("Campo obrigatório", "Preencha o nome de cada criança.");
      return;
    }

    setLoading(true);
    try {
      const checkResult = await checkRSVPExists(
        nome.trim(),
        formData.sobrenome.trim(),
        formData.telefone.trim(),
      );

      if (!checkResult.success) throw new Error(checkResult.error);

      if (checkResult.exists) {
        Alert.alert(
          "Você já confirmou sua presença. Caso queira alterar os dados, entre em contato com os noivos.",
        );
      } else {
        try {
          const result = await submitRSVP({
            nome: nome.trim(),
            sobrenome: formData.sobrenome.trim(),
            telefone: formData.telefone.trim(),
            igreja: formData.vaiIgreja === "sim",
            festa: formData.vaiFesta === "sim",
            crianca: formData.crianca === "sim",
            idade_crianca: formData.idadesCriancas,
            qtd_crianca: formData.qtd,
            nome_crianca: formData.nomesCriancas,
            recado: formData.recado.trim(),
          });
          if (result.success) {
            setNome("");
            setFormData(createInitialFormData());
            Alert.alert(
              "Confirmação enviada",
              "Sua confirmação foi enviada com sucesso!",
            );
            Alert.alert(
              "Atenção",
              "Mais próximo da data do casamento, nossa equipe de cerimonial entrará em contato para confirmar sua presença e compartilhar informações importantes sobre o grande dia. Caso não receba a mensagem, pedimos, por gentileza, que entre em contato com os noivos.",
            );
          } else throw new Error(result.error);
        } catch (err) {
          Alert.alert("Erro ao enviar confirmação", err instanceof Error ? err.message : "Tente novamente.");
        }

       
      }
    } catch (err) {
      Alert.alert("Erro ao verificar confirmação", err instanceof Error ? err.message : "Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.safe}>
      <StatusBar
        barStyle="dark-content"
        translucent
        backgroundColor="transparent"
      />

      <ScrollView
        onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="never"
        bounces={false}
      >
        <View
          style={[styles.section, { backgroundColor: C.branco }]}
        >
          <Reveal scrollY={scrollY}>
            <Heading kicker="RSVP">Confirme sua presença</Heading>
            <View style={styles.form}>
              <Text style={styles.label}>SEU NOME *</Text>
              <TextInput
                value={nome}
                onChangeText={setNome}
                maxLength={80}
                autoCapitalize="words"
                placeholder="Digite seu nome"
                placeholderTextColor="#9b9094"
                style={styles.input}
              />
              <Text style={styles.label}>SEU SOBRENOME *</Text>
              <TextInput
                value={formData.sobrenome}
                onChangeText={(text) => setFormData({ ...formData, sobrenome: text })}
                maxLength={80}
                autoCapitalize="words"
                placeholder="Digite seu sobrenome"
                placeholderTextColor="#9b9094"
                style={styles.input}
              />
              <Text style={styles.label}>SEU TELEFONE COM DDD *</Text>
              <TextInput
                value={formData.telefone}
                onChangeText={(text) => setFormData({ ...formData, telefone: text })}
                maxLength={20}
                keyboardType="phone-pad"
                placeholder="Digite seu telefone"
                placeholderTextColor="#9b9094"
                style={styles.input}
              />
              <Text style={styles.label}>
                VOCÊ PODERÁ COMPARECER NA IGREJA?
              </Text>
              <View style={styles.choiceRow}>
                <TouchableOpacity
                  onPress={() => setFormData({ ...formData, vaiIgreja: "sim" })}
                  style={[
                    styles.choice,
                    formData.vaiIgreja === "sim" && styles.choiceSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.choiceText,
                      formData.vaiIgreja === "sim" && styles.choiceTextSelected,
                    ]}
                  >
                    Sim, estarei lá
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setFormData({ ...formData, vaiIgreja: "nao" })}
                  style={[
                    styles.choice,
                    formData.vaiIgreja === "nao" && styles.choiceSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.choiceText,
                      formData.vaiIgreja === "nao" && styles.choiceTextSelected,
                    ]}
                  >
                    Não poderei
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.label}>VOCÊ PODERÁ COMPARECER NA FESTA?</Text>
              <View style={styles.choiceRow}>
                <TouchableOpacity
                  onPress={() => setFormData({ ...formData, vaiFesta: "sim" })}
                  style={[
                    styles.choice,
                    formData.vaiFesta === "sim" && styles.choiceSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.choiceText,
                      formData.vaiFesta === "sim" && styles.choiceTextSelected,
                    ]}
                  >
                    Sim, estarei lá
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setFormData({ ...formData, vaiFesta: "nao" })}
                  style={[
                    styles.choice,
                    formData.vaiFesta === "nao" && styles.choiceSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.choiceText,
                      formData.vaiFesta === "nao" && styles.choiceTextSelected,
                    ]}
                  >
                    Não poderei
                  </Text>
                </TouchableOpacity>
              </View>
              {formData.vaiFesta === "sim" && (
                <>
                  <Text style={styles.label}>
                    VOCÊ TRARÁ CRIANÇAS COM VOCÊ?
                  </Text>
                  <View style={styles.choiceRow}>
                    <TouchableOpacity
                      onPress={() => setFormData({ ...formData, crianca: "sim" })}
                      style={[
                        styles.choice,
                        formData.crianca === "sim" && styles.choiceSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.choiceText,
                          formData.crianca === "sim" && styles.choiceTextSelected,
                        ]}
                      >
                        Sim
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        setFormData({ ...formData, qtd: 0, crianca: "nao", idadesCriancas: [], nomesCriancas: [] });
                      }}
                      style={[
                        styles.choice,
                        formData.crianca === "nao" && styles.choiceSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.choiceText,
                          formData.crianca === "nao" && styles.choiceTextSelected,
                        ]}
                      >
                        Não
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {formData.crianca === "sim" && (
                    <>
                      <Text style={styles.label}>QUANTAS CRIANÇAS? *</Text>
                      <View style={styles.choiceRow}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <TouchableOpacity
                            key={n}
                            onPress={() =>
                              setFormData((current) => ({
                                ...current,
                                qtd: n,
                                idadesCriancas: Array.from(
                                  { length: n },
                                  (_, index) => current.idadesCriancas[index] ?? "",
                                ),
                                nomesCriancas: Array.from(
                                  { length: n },
                                  (_, index) => current.nomesCriancas[index] ?? "",
                                ),
                              }))
                            }
                            style={[
                              styles.numberChoice,
                              formData.qtd === n && styles.choiceSelected,
                            ]}
                          >
                            <Text
                              style={[
                                styles.choiceText,
                                formData.qtd === n && styles.choiceTextSelected,
                              ]}
                            >
                              {n}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      {formData.crianca === "sim" &&
                        Array.from({ length: formData.qtd }, (_, index) => (
                          <View key={index}>
                            <Text style={styles.label}>
                              IDADE DA CRIANÇA {index + 1} NO DIA DO CASAMENTO *
                              (17/04/2027)
                            </Text>
                            <TextInput
                              value={formData.idadesCriancas[index] ?? ""}
                              onChangeText={(value) =>
                                setFormData((current) => ({
                                  ...current,
                                  idadesCriancas: current.idadesCriancas.map((idade, idadeIndex) =>
                                    idadeIndex === index ? value.replace(/[^0-9]/g, "") : idade,
                                  ),
                                }))
                              }
                              maxLength={2}
                              keyboardType="number-pad"
                              placeholder="Informe a idade"
                              placeholderTextColor="#9b9094"
                              style={styles.input}
                            />
                            {Number(formData.idadesCriancas[index]) >= 8 && (
                              <Text style={styles.ageNotice}>
                                Crianças com mais de 7 anos na data do casamento
                                precisam fazer o cadastro individualmente.
                              </Text>
                            )}
                            {Number(formData.idadesCriancas[index]) < 8 && (
                              <>
                                <Text style={styles.label}>
                                  NOME DA CRIANÇA {index + 1} *
                                </Text>
                                <TextInput
                                  value={formData.nomesCriancas[index] ?? ""}
                                  onChangeText={(value) => {
                                    setFormData({
                                      ...formData,
                                      nomesCriancas: formData.nomesCriancas.map(
                                        (nome, nomeIndex) =>
                                          nomeIndex === index ? value : nome,
                                      ),
                                    });
                                  }}
                                  placeholder="Digite o nome da criança"
                                  placeholderTextColor="#9b9094"
                                  style={styles.input}
                                />
                              </>
                            )}
                          </View>
                        ))}
                    </>
                  )}
                </>
              )}
              <Text style={styles.label}>RECADO PARA OS NOIVOS</Text>
              <TextInput
                value={formData.recado}
                onChangeText={(value) => setFormData({ ...formData, recado: value })}
                maxLength={400}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholder="Opcional"
                placeholderTextColor="#9b9094"
                style={[styles.input, styles.textArea]}
              />
              <Button
                title="Enviar confirmação"
                disabled={loading}
                onPress={sendConfirmation}
              />
              <Text style={styles.helperText}>
                Mais próximo da data do casamento, nossa equipe de cerimonial
                entrará em contato para confirmar sua presença e compartilhar
                informações importantes sobre o grande dia. Caso não receba a
                mensagem, pedimos, por gentileza, que entre em contato com os
                noivos.
              </Text>
            </View>
          </Reveal>
        </View>
      </ScrollView>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: insets.top,
          backgroundColor: C.branco,
        }}
      />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Invitation />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fffdfb" },
  scrollContent: { flexGrow: 1, backgroundColor: "#fffdfb" },
  content: {
    width: "100%",
    alignItems: "center",
    zIndex: 1,
  },
  hero: {
    flexGrow: 1,
    minHeight: height,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  heroFrame: {
    position: "absolute",
    top: 10,
    bottom: 10,
    left: 14,
    right: 14,
    borderWidth: 1,
    borderColor: "rgba(241,211,214,0.48)",
    borderRadius: 4,
    zIndex: 2,
  },
  eyebrow: {
    color: C.rosa,
    fontSize: 11,
    letterSpacing: 4,
    marginBottom: 18,
    textAlign: "center",
  },
  scriptName: {
    color: C.branco,
    fontSize: 62,
    lineHeight: 72,
    fontFamily: Platform.OS === "ios" ? "Snell Roundhand" : "cursive",
    textAlign: "center",
  },
  ampersand: {
    color: C.rosa,
    fontSize: 34,
    fontFamily: "serif",
    marginVertical: -1,
  },
  heroDate: {
    color: C.branco,
    fontSize: 20,
    fontFamily: "serif",
    marginTop: 24,
    textAlign: "center",
  },
  heroTime: { color: C.rosa, fontSize: 17, marginTop: 4 },
  heroSub: {
    color: C.rosa,
    fontSize: 10,
    letterSpacing: 2,
    textAlign: "center",
    marginTop: 12,
  },
  countdown: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 7,
    marginTop: 28,
    marginBottom: 30,
  },
  countItem: {
    minWidth: 65,
    paddingVertical: 12,
    paddingHorizontal: 5,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(241,211,214,0.45)",
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  countNumber: {
    color: C.branco,
    fontSize: 25,
    fontFamily: "serif",
    fontWeight: "600",
  },
  countLabel: { color: C.rosa, fontSize: 9, letterSpacing: 1.2, marginTop: 3 },
  button: {
    backgroundColor: C.vinho,
    borderRadius: 999,
    paddingVertical: 13,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
    marginTop: 10,
  },
  buttonBlue: { backgroundColor: C.azul },
  buttonOutline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: C.vinho,
  },
  buttonWhite: {
    backgroundColor: C.branco,
    alignSelf: "center",
    paddingHorizontal: 28,
  },
  buttonText: {
    color: C.branco,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.1,
    textAlign: "center",
  },
  buttonOutlineText: { color: C.vinho },
  buttonWhiteText: { color: C.vinho },
  heroFoot: { color: C.rosa, fontSize: 28, position: "absolute", bottom: 22 },
  heroFootText: {
    color: C.rosa,
    fontSize: 12,
    position: "absolute",
    bottom: 22,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 58,
    backgroundColor: C.creme,
  },
  roseSection: { backgroundColor: "#fbeceb" },
  heading: { alignItems: "center", marginBottom: 28 },
  kicker: {
    color: C.vinho,
    fontSize: 10,
    letterSpacing: 3,
    fontWeight: "600",
    textAlign: "center",
  },
  sectionTitle: {
    color: C.azul,
    fontSize: 35,
    lineHeight: 41,
    fontFamily: "serif",
    fontWeight: "600",
    textAlign: "center",
    marginTop: 8,
  },
  heart: { color: C.vinho, fontSize: 13, marginTop: 14, letterSpacing: 2 },
  timelineRow: {
    flexDirection: "row",
    gap: 17,
    paddingVertical: 22,
    borderTopWidth: 1,
    borderTopColor: C.rosa,
  },
  timelineLast: { borderBottomWidth: 1, borderBottomColor: C.rosa },
  timelineTime: {
    width: 65,
    color: C.vinho,
    fontFamily: "serif",
    fontSize: 25,
    fontWeight: "600",
  },
  timelineCopy: { flex: 1 },
  timelineTitle: {
    color: C.azul,
    fontFamily: "serif",
    fontSize: 23,
    fontWeight: "600",
    marginBottom: 4,
  },
  bodyText: { color: C.text, fontSize: 15, lineHeight: 24 },
  card: {
    backgroundColor: C.branco,
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: C.rosa,
    marginBottom: 18,
    shadowColor: C.vinhoEscuro,
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.vinho,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
  },
  iconText: { color: C.branco, fontSize: 20 },
  tag: {
    color: C.vinho,
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: "600",
    marginBottom: 5,
  },
  cardTitle: {
    color: C.azul,
    fontFamily: "serif",
    fontSize: 25,
    fontWeight: "600",
    marginBottom: 8,
  },
  accordion: {
    backgroundColor: C.branco,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.rosa,
    borderTopWidth: 3,
    borderTopColor: C.vinho,
    marginBottom: 13,
    overflow: "hidden",
  },
  accordionOpen: { borderColor: C.vinho },
  accordionHead: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 17,
    paddingHorizontal: 15,
  },
  smallIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.vinho,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  smallIconText: { color: C.branco, fontSize: 16 },
  accordionCopy: { flex: 1 },
  accordionTitle: {
    color: C.azul,
    fontFamily: "serif",
    fontSize: 21,
    fontWeight: "600",
  },
  accordionSubtitle: { color: C.text, fontSize: 13, marginTop: 2 },
  plus: { color: C.vinho, fontSize: 27, marginLeft: 8 },
  accordionBody: {
    borderTopWidth: 1,
    borderTopColor: C.rosa,
    borderStyle: "dashed",
    padding: 17,
  },
  form: {
    backgroundColor: C.branco,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: C.rosa,
  },
  label: {
    color: C.azul,
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: "600",
    marginTop: 17,
    marginBottom: 7,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#dccdd0",
    borderRadius: 10,
    backgroundColor: "#fffdfb",
    paddingHorizontal: 13,
    paddingVertical: 11,
    color: C.text,
    fontSize: 16,
  },
  textArea: { minHeight: 100 },
  ageNotice: {
    color: C.vinho,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: C.rosaClaro,
  },
  choiceRow: { flexDirection: "row", gap: 8, marginTop: 2 },
  choice: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#dccdd0",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceSelected: { borderColor: C.vinho, backgroundColor: C.rosaClaro },
  choiceText: { color: C.text, fontSize: 13, textAlign: "center" },
  choiceTextSelected: { color: C.vinho, fontWeight: "600" },
  numberChoice: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#dccdd0",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  helperText: {
    color: "#6f6469",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 12,
  },
  footer: {
    backgroundColor: C.azul,
    paddingVertical: 45,
    alignItems: "center",
  },
  footerNames: {
    color: C.branco,
    fontFamily: Platform.OS === "ios" ? "Snell Roundhand" : "cursive",
    fontSize: 45,
  },
  footerDate: { color: C.rosa, fontSize: 10, letterSpacing: 3, marginTop: 8 },
  petal: {
    position: "absolute",
    top: -25,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 10,
    opacity: 0.9,
  },
  couplePhoto: {
    width: 140,
    height: 140,
    marginBottom: 24,
  },
  relogio: {
    width: 90,
    height: 90,
    marginBottom: 24,
  },
  recepcao: {
    width: 90,
    height: 85,
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  buttonDisabledText: {
    opacity: 0.8,
  },
});
