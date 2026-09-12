<center>
    <hr style="height: 1.5pt; border: none; background-color: black; width: 100%;">
    <br>
    <font size="6"><b>Grundlagen der Programmierung</b></font>
    <br><br>
    <font size="3">
        Prof. Dr.-Ing. Michael Thiel<br>
        Labor für Technische Informatik im Maschinenbau<br>
        Fachbereich Maschinenbau<br>
        FH Münster
    </font>
    <br><br>
    <hr style="height: 1.5pt; border: none; background-color: black; width: 100%;">
</center>

# 5. Praktikum

Führen Sie die folgende Zelle **vor** der Bearbeitung der Aufgaben aus. Denken Sie daran, die entsprechenden `import`s in Leukipp zu nutzen!

## 1. Aufgabe: Fakultät

Definieren Sie eine Funktion `factorial`, die die Fakultät einer Zahl `number` berechnet. 

Die Fakultät ist über

$$
    x! = \prod_{i=1}^x i,\qquad x\in\mathbb N_{+} 
$$

definiert. Beispielsweise berechnet sich $5!$ über

$$
    5! = 1\cdot 2\cdot 3\cdot 4\cdot 5 = 120.
$$

Im Sonderfall $x = 0$ (nicht über die o.g. Formel abgedeckt) wird $1$ zurückgegeben. Für $x < 0$ wird mit `raise ValueError()` eine Exception geworfen.

Des Weiteren gilt:

$$
    x! = x\cdot(x-1)! = x\cdot(x-1)\cdot(x-2)! = \ldots = x\cdot(x-1)\cdot(x-2)\cdot \ldots \cdot 2\cdot 1.
$$

**Hinweis:**

- Sie können Ihre Berechnung mit `math.factorial` prüfen.


**a)** Implementieren Sie eine Funktion `factorial_iter` zur iterativen (**nicht** rekursiven) Berechnung der Fakultät. Geben Sie $0!$, $1!$, $2!$, $3!$ und $4!$ mit `print` aus.

**b)** Implementieren Sie eine Funktion `factorial_rec` zur rekursiven Berechnung der Fakultät. Geben Sie $0!$, $1!$, $2!$, $3!$ und $4!$ mit `print` aus.

## 2. Aufgabe: Laplacescher Entwicklungssatz

Die Determinante einer Matrix kann unter Verwendung des [Laplaceschen Entwicklungssatzes](https://de.wikipedia.org/wiki/Determinante#Laplacescher_Entwicklungssatz) berechnet werden.

Die Berechnung über die Entwicklung nach einer Spalte $j$ erfolgt allgemein über folgenden rekursiven Zusammenhang:

$$
\mathrm{det}\,A = \sum_{i=0}^{n-1} (-1)^{i + j}\cdot a_{ij}\cdot \mathrm{det}\,A_{ij},
$$

wobei $a_{ij}$ das ij-Element der Matrix $A$ ist und $A_{ij}$ die $(n-1)\times(n-1)$-Untermatrix von $A$ ist, welche durch Streichen der i-ten Zeile und j-ten Spalte entsteht.


**Anmerkung**

Numerisch ist der Entwicklungssatz sehr ineffizient. Er eignet sich lediglich für kleine Matrizen oder für Matrizen mit vielen Nullen; hier kann auf den rekursiven Aufruf verzichtet werden, wenn $a_{ij} = 0$ ist. Allgemein sind andere Verfahren, beispielsweise über die [LR-Zerlegung](https://de.wikipedia.org/wiki/Gau%C3%9Fsches_Eliminationsverfahren#LR-Zerlegung) und anschließender Multiplikation der Diagonalelemente, besser geeignet.


**a)** Definieren Sie die Matrix A unter Verwendung von `A = np.random.default_rng(seed=124823).random((5,5))`

**b)** Weisen Sie der Variablen `a_00` das Element $a_{00}$ zu und der Variablen `a_12` das Element $a_{12}$.

**c)** Definieren Sie eine Funktion, welche die Untermatrix $A_{ij}$ zurück gibt.

1. Definieren Sie die Funktion mit folgendem Prototypen

```python
    def submatrix(A, i, j):
```
2. Definieren Sie die Variablen `A_00 = submatrix(A, 0, 0)` und `A_12 = submatrix(A, 1, 2)`, um die Erstellung der Untermatrizen zu prüfen. Geben Sie `A_00` und `A_12` mit `print` aus.

**Hinweis**

- 1.: Sie können `np.block` oder [`np.delete`](https://numpy.org/doc/2.2/reference/generated/numpy.delete.html) nutzen oder zwei ineinander geschachtelte for-Schleifen verwenden.

**d)** Definieren Sie eine rekursive Funktion zur Berechnung der Determinanten über den *Laplaceschen Entwicklungssatz*.

$$
\mathrm{det}\,A = \sum_{i=0}^{n-1} (-1)^{i + j}\cdot a_{ij}\cdot \mathrm{det}\,A_{ij},
$$

1. Definieren Sie die rekursive Funktion.
    - Der *grundsätzliche Fall* ist erreicht, wenn die übergebene Matrix eine 1x1-Matrix ist. In diesem Fall wird `return A[0,0]` zurück gegeben.
    - Prototyp:
```python
        def det_laplace(A):
```
2. Berechnen Sie `det_A = det_laplace(A)` und geben Sie die Determinante mit `print` aus.

**Hinweis:**

- 1.: 
    - Zur Erinnerung: Der grundsätzliche Fall ist der Fall, wo die Funktion **nicht** mehr sich selbst aufruft.
    - Sie können $j=0$ wählen und damit nach der ersten Spalte entwickeln.
- 2.: Sie können Ihre Berechnung mit `np.linalg.det` prüfen.

## 3. Aufgabe: Das Echo

In den folgenden Aufgabenteilen soll Schritt für Schritt eine Funktion programmiert werden, die in schriftlicher Form das Echo eines gesprochenen Satzes im Gebirge nachahmt. Der letzte Aufgabenteil löst damit die Gesamtaufgabe.

Die Eingabe 

    Das Echo

soll zur Ausgabe

    D-A-S DAS das ... E-C-H-O ECHO echo ...

führen.

**a)** Definieren Sie eine Funktion, die einen übergebenen String ohne die Satzzeichen `!?.,` zurück gibt.

Beispiel: Aus `Entschuldigung, wie spät ist es?` wird `Entschuldigung wie spät ist es`

1. Definieren Sie die Funktion mit dem Prototypen:
```python
    def remove_punctuation(sentence):
```
2. Testen Sie Ihre Umsetzung anhand des Beispiels.

**Anmerkung**

Neben der expliziten Angabe der zu ersetzenden Satzzeichen, kann das Paket `string` importiert werden. In der dann verfügbaren Konstanten `string.punctuation` sind sämtliche Satzzeichen definiert.


**b)** Definieren Sie eine Funktion, die das Echo eines Wortes als String zurückgibt.

Beispiel: Die Eingabe `Echo` soll `E-C-H-O ECHO echo` zurück geben.

1. Definieren Sie die Funktion mit dem Prototypen:
```python
    def echo_word(word):
```
2. Testen Sie Ihre Funktion anhand des Beispiels.

**c)** Definieren Sie eine Funktion, die das Echo eines Satzes als String zurück gibt. Die einzelnen Echos sollen durch drei Punkte und jeweils ein Leerzeichen davor und dahinter getrennt werden.

Beispiel: Die Eingabe `Das Echo!` soll `D-A-S DAS das ... E-C-H-O ECHO echo` zurück geben.

1. Definieren Sie die Funktion.
    - Entfernen Sie die Satzzeichen mit `remove_punctuation`.
    - Verwenden Sie für die Echos der einzelnen Worte `echo_word`.
    - Prototyp:
```python
        def echo(sentence):
```

2. Testen Sie Ihre Funktion anhand des Beispiels.

## 4. Aufgabe: Insertion-Sort

Es soll der Sortieralgorithmus *Insertion Sort* zum Sortieren einer mit Zahlen gefüllten Liste programmiert werden.

Ziel des Sortierens im Allgemeinen ist es, in ihrer Reihenfolge ungeordnete Werte (Objekte) in eine sortierte Reihenfolge zu bringen. Beispielsweise ist die sortierte Reihenfolge der Liste
```python
[1,6,8,3,4,2,6,1]
```
diese:
```python
[1,1,2,3,4,6,6,8]
```

Im Insertion-Sort-Algorithmus geschieht dies, indem aus der zu sortierenden Liste der Reihe nach die Elemente ausgelesen werden und in der neuen, sortierten Liste an entsprechender Stelle einsortiert werden. Der genaue Ablauf ist auf der [Wikipediaseite zu Insertion Sort](https://de.wikipedia.org/wiki/Insertionsort) beschrieben.

Gehen Sie in Ihrer Umsetzung folgendermaßen vor:
- Legen Sie eine neue Liste  an (die noch leere, spätere *sortierte* Liste).
- Fügen Sie das erste Element aus der unsortierten Liste in die sortierte Liste ein.
- Iterieren Sie über die unsortierte Liste, beginnend ab dem 2. Element.
- Gehen Sie in einer zweiten (inneren) Schleife linear (von links nach rechts) durch die **sortierte** Liste und fügen Sie das aktuelle Element aus der unsortierten Liste mit `.insert` vor dem ersten größeren Element der sortierten Liste ein.
    - Beenden Sie die innere Schleife, wenn das Element einsortiert wurde.
    - Hängen Sie das Element mit `.append` an das Ende der **sortierten** Liste an, wenn das Ende der sortierten Liste erreicht wurde (das einzusortierende Element ist dann das neue größte Element).

1. Programmieren Sie eine Funktion mit folgendem Prototyp:

```python
    def insertion_sort(values):
        """Sortiere die übergebene Liste aufsteigend.

        Parameter
        ---------
        values : list
            Unsortierte Liste mit numerischen Elementen.

        Rückgabe
        --------
        list : Eine neue, aufsteigend sortierte Liste mit denselben Elementen.
        """
```
2. Rufen Sie `insertion_sort([1,6,8,3,4,2,6,1])` auf und geben Sie die zurückgegebene sortierte Liste mit `print` aus.

---
Prototyp: Jeder Test zählt einen Punkt. Ab 80 % bestanden. Beispiel-Prints werden nicht bewertet. Strukturtests erkennen typische direkte Umsetzungen, keine beliebigen äquivalenten Algorithmen.
