import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

const LOGO_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAMAAAADACAYAAABS3GwHAAAzUUlEQVR42u2dd3hUZdrGf6dMT0ghAQQLFqSD9IQOK6zo2rAs4gqyfqKuqyi7i2VXwI4u9oLKrgpWRNQVUUSRDqEXAUGqiIWSRjKZctr3x5kzJBhgkswkA5znury8NDPJzHue+3nvpwuuRs0NbLHlFBXRPgJbbADYYosNAFtssQFgiy02AGyxxQaALbbYALDFFhsAtthiA8AWW2wA2GKLDQBbbLEBYIstNgBsscUGgC222ACwxRYbALbYYgPAFltsANhiiw0AW2yxAWCLLTYAbLHFBoAtttgAsMWW5BLZPoLaEUEQqvR6w7DHNdkAOElENwx0Va3a1SxJiFUEjS02AJJPDAO3y4nP68UwjOPeBNZr/GVlhENhsEFgA+CEPVxJwl9QyB+HD+XZxx9A1TQk8dhul6bryJLEXfc9zNQp7+LLzEDVNPswbQCc2DdARnoaBnA8e269xu1ygu0H2ABIdsdWEAR0XT+uD2AYBoqqIkvSMV+rahoOWUaPQflFUcSI/G5bqid2GLS6yi+KqKpKwO9HOo5SlwdLrP/E4iQHAkE0TUcQbT/BBkAtiiRJhMsCZNXPpGf3bpQVFiHLtXeZyrJMoPgQrVs0w+t1o4bCiKL9KG0A1Jbyh0J43S6m/fcF5s18jwED++E/kI/D4Ui88jtk/AWFdO58AUu/nMHUl58CTUNTVRsENgBqR/ndDgefTn+T3t27IgoC/3vvvwy8eAClBw7gcMiJVf78Qrp268yXH71FvdQULht0Ie9PfQVdUdBtENgASLjyyw4+/eAN+vXMQVEUDMPA43LyybuTGThoIKUH8hMCAkv5u3TrxBcfTSEzIx1V1VAUhasuvYj3p0xCUxT7JrABkEjll/l0+mHll2UZURTRdB23y8kn774WuQniS4cOK39nZs+YSma6qfySJCLLcgUQ6DYIbAAkkvaUV/7oIYoiuq7jdrn45J3JDBxk0aGag8DhcERpz+yPppqWXzOVv7xTfCQIbDpkAyBhtKeyiI8FgvJ0qOjAQcQagEB0OCjKLzhMe9LTTMtfiWLLskzYpkM2AOJ2MKJIsCxQKe051nvK06GLLx6AXnKwWj6BwyGjlxSQm/Nb2nPU91RyEyjhcJUrUW0AnOIiCAK6qpKdmc4n016PSfkro0MfvfUqOf0vZN+B/Cp/hgP5BbTs2InPp79ZKe05qr9QDgTvvvESbocDYijCO2VveTkla7x9DL+lPsHiQ4z5+x2MGHo1gWAQp9NZNQDpOg6HgysvG4QoCLRr3SLGLK/5mv0H8nl47D00zM46ruWv9PYKhWjfpiWqbvD17Lk4I9Wothxx2vai7MoVGMNAFgRen/QU11x+ccw3QHkxDCPKwauqfBZQdF2vsvVWVRWHw8HchUu5/s9/paikFEGSbADYFCh2xUUQCCoKQ0fczoyZs3E4HKhVbGqxbgKtGuXMuq7XSPnnLc7jij/+mQMFRYiybCu/DYCqg8DhdCI6HAwZflsUBEo1QFCdSEysRXFHU/7LrhlBUFVxez3HrVa1AXAKRXaqolS6riPJMlI5EDircRPUhlRQ/mtHEFQVnC5XlW6f6oDOBkCSc3lJkpBlCUEQCAQCKIpSpTZDXdcRZfk3N0EygaCi5b+RoFJ15UcQUFQVRVGjZ2YaDNsJPqEUXhQEBFFA1w1C4TB6IAiahuDx0KL5eZSUlrLv1/1IDkeVeLEoimiqiq4ovD9lElddehFhRcEhy0mk/NW3/Lqqklk/E8Mw2PfjT6Dr4HLhdLuQZRkB0A0dXT+5fIkTPgwqiiKSJCIIIoqqEvKXoZT6UTWd0xo1pG/v7txy0w2Mv/cuHrrvbsrKgsz9ci6ulJQqcWPDMJAk8yaZPuNTWrdqQduWzVHrMNsaD9oDIMsSwcJiHh5/D5MmPkxOTmcaN2mMqmkUFBZRVliEEgiiIiA75MiNenKQhxP6BjAMCAeDEAqBJJGRnUXbVs3p3b0rfXvm0KFdazIz0iu8Z97iPPpf8kc8Kb5qOYeV3QTVCZHGnfaoarWU36I/WlhhxTf/o0O71hV+9P32neStXMu8xcvIW7mW7bt+QC31gyQhuF04a6EHwgbA0a4vUaRFs3Pp3rUj/Xrm0LXTBZze5LQKr9E0DV03EAQzwXWopJRWuQPZt28/DqezWuHBuqZD8aA9h7+LQDAQpNl557Bh0Rc4HDJaxDDIkRvPklAoxKbvtrEobyXzF+exZv1G9h/Mx7ABUPtcX9M0UlJ8bMn7igbZWRWcVk3TEYTfRn10XUeSJK7400j+98ksvOnp1bOYERDoqopWyzfBb2iPUn3lt+iPP7+Q4SOG8uZLE1FVtUKPs67r6IaBAL/5bhs2fke3AVeakywE4YTMNZyQRM4wDByyTOH+gyxfsx5V1QiGQmiRxJEsS1G+fmREB6Bfz1xQtRqF/OoiOhSXaM9RpF+v3CitPBLosmSep5XUCwTNZvyNW7YRPHQI+QTOMp+wnowgCqCozFu0zFR48fijBC1ntVf3LsgpKWhqzRTHyhPUNFlWPdqjxkX5FUXFk5FOj66dopTomFE2UcQhy0iSyFfzF4HO8Ycd2QCIv+i6AW4ni5etwjAMZDm20SSGYdC6eTPOOfssQqFQjedv1kayLF7RnsoMQjgYpNX553FO0zMr1C4d4/41+yQUhWUr1yJ4XOiaYQMg/jz/cCLraIrndLvZtHUbu374MaYBVZbv4HK5yOnSASMYjEsIM5F0KJG0RxQFCIbpmdsZURRRY7gRzYCCwOYt29i58wecLje6Ufm5S5KU9A05YrJqv64bKIpKWVFxBAi//agOWaasoJClK9YcvhWOa78qct743Ujxp0OJoj2HfSlAlkyfiNgS5NYZL1q2EqWkFFkWK71ZRFGkrLiYgN9vA6CqER41HCY7K5P5M99j2LAhBP1llJWURksaDr/Y/Nc3i5ZV+O9jfuHI+3t264QnIx1FVeNW/xJPOpQo2lP+nMOKQkbDbLp1al/BRzqu74WZT0EWKzjNZgBCJuAvI1B8iOuGXMWMt15FijjJQhI6C0kHAFGS0ErLuHfUbfTM6cyUlycyd+Z75HbrjD+/kHA4bKbmI5RHcLtYtmINYUWJyQ+w5mme0/RMWp5/HuFgMK4FYEejQ1VJulnNNImgPeUNgRoI0L51Sxo1bBCNoB0v+iZLEiWlpaxcswHR7Y5+L7MTTcV/MJ+O7Voz66OpvDv5OQZfehG3DL+OcFExUgzP55QGgCiKBEtKad+1IyNvvA5VVVFUlf69u7P4yxm8NukpzjitIf4DB01FEyWcLhc7du7mu63bERBiUjRV1RBFkV45nSEUPmbko8Y3wbDb+PSLr01gx/DZzO8lMm/RskicX4278puWXISwQt8e3cy/q2kxfTaAtRs289Pen3C5XNFbw38wn+yMNJ595lGWzf2Eiwf2R1FUVFXlX/+4gybnNCUUCCTd0o/kugEEAV1TmTB2TDTFLkuS6ZwZBjcPv45VC2YxZswoHKKIv6AQp9OJVlbGwmUrYvYDrGfQt1cuSFJCppDruo7D5UQNBPjgk1kIxNYVpkf6d19/ZzqlB/PxeD1xV37r8wluN316dovSl+P7DObnX7BkOUI4jMMhU1ZUjKFp/PWOkaxeOItRt/4Zhyyjqmr0Rs5MT+PB+0ej+ssQJMkGQGUiSxKBwiIuvWwQF13YJ9IELkWiCWZGV1FVsjIzeOKh+8ib+wmDr/wDJYdK0ANBFi9bVYGjHu+mAejW6QLSG2QTVhIzOcHQDQRRxOf1Vvm9Xo8bQZYT0swiCALhUIjTmpwWrf2Jhf+LkeexePlqdFXlUEERgy76HYtnz+CFJx+kcaOGKKqKYVDu2UlomsaN111F1545BA4dOu6SkFMOAIIgoGoantQUJowdE3GYKgeJrusoqkqbls2Z8farzPrgDS7I6cysOd9QVFwcU1bS8h9Oa5hNh7atUAPBuNOg8lazOkqs64mb+y+KIlowSNeO7UlLTUXVjp8V13UdSRT5+dd9zJ23kJbt2zBtyiQ+/3AKXTq2Q1VV9Mh2myN/lVVJ++8H7wNBSKraoaQAgCRJhAqL+MvIG2nVvBmaph3VIgmCgByxKpqmcfGAvqxYOItxY+5k1w97K1zVxxKLVvTt0Q3CyklT3hurwUHV6G+VP1QBoJu3bueeu25j9aIvuPbKS6LPobLSk/LPV1VVenfvytAhVxGo5XHyx2QeyfAwwsEgjc9uyn133Rp1AmOlMaqq4pBl/nHnLdFtKTGF8yIK36dHNwS365Tqm1VVDTk1hV65XWKnP5HoWZ8e3biwT4/o2UsxcnorC//I/aOZOWsOwXAYMQlqiOrc7ImSiFJSygP33En9zIyYwnFHWhdd16sca7coT4d2rWl8ehNCodAp0Q8rCiLhUJBzz2lKy+bnxbS5srxYDq5VWVsl2qVpND3zdP5x162Eiw5V6f0nJQAkUSRwqJQLunVmxNCrzau0mhMUqnqYVllEvdQUunRohx4MnRJzNEVRwAiGyO3SEZfTiaZVrSq2fGdcdXwPXde569YRnNu6BYHS0jo/8zr969ZGxOcnjMPldNZ6o3m0PLpXDqjqKbWSt3+vnOgzqEW+S1hRSPH5ePmph0HT6zw3XLcAMAxkt4tnXprM2g2boomV2tqLGy2Pzu2CnJqCpp3cfoAVSvZmZtDdKn+uJdRrmoYoCLhdLnbv2cuHH89C9rhj2oZ5UgNAlCQ+/ngW3Qdcyd33PcS+AwejrYVagoFgOWatmjfjnHOaEopTdWgyAyAcDNKq+XmcfdYZ6DEGDGp6y+q6jizLlAUCPP70y3TqcwmTJ0+xnWALBN6MdAxR5NlnJ9Gp9yW8OHmKuTFdNvtTExWhsfIPLqeT7l06YgRDSZeqjzf/JxSmV06XSF+zltDnaoVHJUniw/99Tpe+l3L/Px+mxB/Al5WZFF1kSWHuLEvvy6rPLwfzuePOe+kxcDBffD0/2o6nalpiDizyK/v1zAFBiGY7T84bQERwOOgb4f+JwLqBuexbFM31TSvXbuDiq2/kmutHsvn7Hfiy6iPJUky9B6cMACxRVRWnw4Evqz4rVq3j4sHD+OOI29m8dTsOax9XnHm6FQ7tmdsZ2eejpKAgsvtLOIkUX8DhcFBaWIg7NYVunS6o4APFzZDpplPrkGV+2befO8aMo9fvr+KL2V/jTU/D4/WgqmpS9Q8nHeE1DANVVfGk+PCkpvDBB5+Qe+HlPPDoU5SU+pHl+BavWaG5s888gzkfTaVH92748wsIhQ6XXZ/IIkfi9qUHDtKubWumv/EiDbOzqjV5+tjPzSxVMYCXJk+lS99LefGF10CS8KanRcbTJF+QQUxWi2U2YAv4MjM4VFrGI/8ay1mtc5k67WMMQ49r9MByhvv1zGHRlzN4bdLTnHFaI/wH86uc8EkWsWL1/oP5ZNZL5cknxrN83kwuGdg/7spvPguDmbPncl77Xvx15O389Os+UhtkmyUPSbyhRk4WhT/aTE/J56P5eefQI+cauna8gDYtmiXkMC2HWBQEbh4+hMGXXcS/n3uFF1+bgr+wCE96WjSqkdyOrlk5W1Z8CNnlZOQtN/KvMXdyRuPTojQz3oC2nkb9zHT+b9gQVm9oy4o169j7488QDoPDgexx43Q4EIRIoZ+uJ0VRXFLUAqmahhoIgqKA00mTJqfRuUNb+vTIoVduF9q0bI7b7apAkxJiNSOcWFFV6mekM2H8vfzpj4N5cMIzfPjxLBAFfKmpaIlyyGt4jpIk4feXQSjEgIH9ePD+0eR26Rj9TpIoJuQ2swxS966dovmFwqJi1qzfyIIly1m4dAUbNm2h8MAB0CJDdz1upAj9PHUBIAgEg0Ey0urRrktHeuV2oU+PbnRs35bMjLTfOMgGZi1Loh1Uq+xa13XatDyf6VMmMev6bxj32DOsXr4KKcWH2+1OmhHpsiwRDisECwpp3qYVY++5k6HXXBE9N2u4VW1E83TdQBQFMtLT+F2fHvwuUji396dfyFu1lgVLlrN0+Wo2f7+dQEkJ7pSUOjUmdQYAURQJlZYy9t67GTn8Opo0bnTUw6xOrU+8LKqmaRjAJQP7M7B/b17579s8/vRL/LJnL670tOhr6obnm03p/vxCMrKzGDX6L4y+/WZSU3xm+2Wkbqc2n6kVWLIMiNkcI3J6k9O4uslpXH35xWiaxrYdu/ngk8946InncLhcdQYCsS4BoIfCOBwOmjRuRCgcjvaQWiXRh5c01J0DJYoikiiaLX6SxB233MiahZ9z5523gKZRVlRc6/NvBNEc/1hWUkqwrIw//elaVs6fybh77iI1xWda/WquZoq3AbEmeVgVu4qqousGLc4/l3OanoVWFqjSBsyTBgC6roPLyWdffmP2z8ryUWd6JktUxYhw6UYNs3nuifEsmfMRl1w8wJx/UxZIeNjUGjsSDoXx5xfSvVtn5n76Hm+99iznnn1WRLmSM2oVBUSkY8wwDGbMnA2iSF26U3UGAMMwcLjdbPp+G3t//jUaj6+Nv1uTaIdcrv+g0wVt+eyDN/jwncm0adEM/4H8SDO4nBAA6rqO/8BBzjytEf959RkWfTmDfr1yUVUVTdN/M848GcUcYynj95exesNGRI+7Th3hOgWA0+Gg9GABy1ZGJrslwBRYPbmqqkWplabpNQNCOf9A0zSuumwQK+Z9ypNPjCc9JQX/wfy4+S3RKWuFRciiyD333MWqhbO46YY/gmFElmhLNQoMWHU7lu+lJjBpZT3jdRu/Y++evbjqkP/XKQCiJlXXmWdNdosjvVIjyilGQn8Oh2yGCcvKor6FGofhsmLEP/C43fxj1C2sWvAZN48cjhYOc+jQoWr7B4IgIMkypf4yAiWlXDX4UvK+/oQJD95L/XIT7WrKn7VydTtmREmOTH82wWudY7yU1Oo/XrB0OUYgeGo3xOi6geB2sWT5apSIk1kTC2YptCRJEZ9CJhAMsnLNBp5+cTKXD72Z1l1/x6h7H2Tf/viVXUvlplWcdUYTXntuAgu+mM6Afr3Q/EUEgsEq/86woqCV5tO5fRs+m/4mH771Cm1bNY/y/JqGNcuXKYdCYSa+8BoXdP89w24dzetvT2PLth0A0XO0eoJVVavRDSqJ5ueevzgPqrioMCE2OBk2xOiazpoFM2nTsvkxJ0JUpDVGpD1PrPh6w2DLtp0sW7GaeYvzWL5qLTt270Hzl4EkmeP8/H4an3UG9//tr9wy4npk+XAos6YWSTfMLKdlUV974x1+PZDP2DF3mrOOjvP7tYhyjxk3gbQUL/eOvr1CqLWmn8+ihNbn+2TWHMY9+hQb1m4At9vM3BoGnvQ0Wp5/Lj1zutC3Zw5dOrbj9MaVr5+yQtWxjFYURZH9Bw7SMncghw6VINfxFvs6B4AsS/gPFjDppYnc+ufrURT1NzM+rWkP1mEfya1/+vlXVq5Zz/wleSzOW8XmrdsJFBWbP/S4cbtc0Zi5FSUJBoNopX4653TmoX/+jUEX9gUOZ0yFOOwNKL8lvqoPWdO0qJLGq3xB1bTorbd+42YeeOQpZs6aA7KEL7I1UxDMEbaKqhIOhg4vIGyQxQVtWtGne1d69+jGBW1bkZF+tGRl5SFY6zt99uU3XHrVsGiR3Cl9A0iSRFlhEdf+8Uqmvf5i9GEfazdVcfEh1mzYxIIleSxYYqbZC/YfAE2L7ra1HvTRdttGSwcOlQBwzRUXM+6+0bRu0SyuSmfeaFKVa+8FQYhmcWsKRk3To9P19h04yISnX+bVN94hUOrHm55W6fAuAXN+qCgK5jZORTHLVcIKuF2c3uQ0Ol3Qln69cuiZY5aruFzOCkZL1TQEDtcnqaqGwyHztwce5emJL+LLyqzzvoA6B4AgCITDYc44vTEbl8zGHekLLm9BQqEQm7ZsY/EyczvhqnXf8uPenyAYBqcD2e3G6axeoZX1dwJFxaSkp3HHLTfy9ztGkpmRHuHJRp0mamp6CxmR0K2mabz65rs8/tRL7N35A66MqmWxDxcsmuHqUCiMHjQLFuUUH83OaUq3zh3o1yuX3C4daHbu2ZXQJR1RksgdOJiVq9bi8fnqvBYoKXwAURQJ+stYueAzOrVvg24Y7Nz1A8tWrGHe4jyWrVjN9l17UEtLozze5XKajlnkpqgpj5RkCVVRCRcV0/T8c3lgzChG/OlahMhtINRCDVI8Q79aJLkIMOebhYx77GnylixH9PnweNxoEbpSE8NlWnZQNZ1QMAjBEAC+zAxann8uvXO70rdXDl06tKNRwwYA/PzrPpp16hfTOMZTCgChklKGDRvCaQ2z+eqbhWzZtpPSgkLzBW43LrcLuRyPT4TjZNGiskAAoyxAz97deeiff4tuk4mXf5BIKe87bNm2g/GPPcO0j2aailkvcZWsoigiRuZ+qqoaWWAeBlkmq2E27Vq14PcX9qHUX8YjE57FneJLitLypNkTLAgCwbKA6XS5nDjdbrO04Bg8PnGANK/6suISREnkT38czANj7uS8c5rG1T+Iq+LretT5LDp0iKeef43nXnmDEquXQTCjbbX1LK2GJsMwCIcj/oOqgtuF2+NJmnLypFqULUacLivEWdeHJEkSumEQLCwiPbs+o2+/mbv+chOpEetl1MJYkaqGXd98dzqP/PsFdnz3Pc70NGSHnNDpD7HTJSFSFGckVVPRCbkpvvZDtTLhcBil+BDN27TkgTGjuP7aK6K3QV1UrJrJPx2Hw1T8hUtXMO6xp5j/zSIEjxuv15uUjTvJJjYAqugfWB1XFw7oy4P3/43uXQ93XMm1RIvK8/xdP/zII/9+ninvzkBTFbxp9TCSzMraADiJpELPrdPJiD9dw9h7RkWzpLVhcQVBIBAI8uyk15n4wqsU7DuAOz0tOoHZFhsAteMf6DrBklIyszK59aYbuGfUraT4vFElTQTtUVWVt6f/jyefeZmtW7bh8Hlx1sFg4ZPGoNlHUG1tNJVcEAgGQ/j9ZbVi/XXdYMeuPfywZy+IQqSWxqY79g1Q275ApITiuqsv48F//o1mkRBpbVGgXT/8yPjHn+HtaR+jaxretFSb+9sASKTSgSTJBAIBdH8ZuT1zePD+vzGgX886dYIXLFnO2EcnsnD+EgSPB29kraod/bEBEFe+r2oa4cIizjzvHO4bfTs333hdtFleqIMGdDNXYsb/DeDNtz/gkYkvsHPrdpxp9ZIi/m8DoBoRFqv6MFHlDlX9PAgQKCzGWy+V228expi7biMrMyMah6/rQrnyGeDC4kM89fyrPPfqG5QWFifNNLvylaV2IuwYvDYYDEIgCLKMFBmlVxeZ4SjPLykFXWfw5YMYd+/dtGvdotbpTnVo0Zbvd/DghGd4f0bia4COajwilaNg1QZFegtcLtxeuxTiCIohEiwu4Y47bubsM8/g8y/nsm7TFvb/ug8UtVZrg2RZJhgMoZWW0rFLR8bfP5pLL/pdVPGTuRjuyG6v2XMXMP6xZ1i+dDliig+P242mqQkZQ1K+OlTTdIKhkGnMAG9GGi3OO5ffX9iHX/YdYOrU93GlptjFcOUPTwmGWLvkC9q2bA7Avv0HWb3+W+YtXMbCZSvYtGUb/nLVoW53xS6vGpdDR2rjQ0XFNDqjCfeO/gu33XQDTocjbu2ItecfmBPZZFlC03Umv/kej058gb27duNKS0eSaz7NrnzBm64bhMNhtGAQVA3R6+Xcs88kt3MH+vXuTm6XjjQ7tymiKLJ2wyY69b4El89bpQXdJy0ARFEkGAjQ7LxzWb9oVnS2zZHVltt27GLp8tXMW7yMvFXr2L5zd7TPV/K4cTqd1aJL0cxuUTFOr4eRNw7lvtF/oXGjhhXW/JyIUn6D+/6D+TzxzCReef1tykpKTP/AqJp/IIoCoiAeLnkOBKPTnxs1bkTHdq3p06MbfXp0o13rlng87gqg1HWdUFihXc9B7P5hDy6Xq86X5CVHT3B+IX/+v2H89/kJUX5tXeeWJStPO4KhEBs3b2XBkuXMW7yM1es28usvv5rtek4nDo8bR5QuVe50RXl+qR8UhUEX/Y4H7/8bXTq2K0d3pBqvEbKa/KtKm6zvH+9e4A2btjD20af438zZIEn4UlOO6h/8htYEQxCZcJGSmUGblufTq3tX+vfKpXOHdmTVz6z4d4/oEbb8lBtuHc3bU9/HVz/DbomUJQl/QSHvTJ3E0Ksvr7QpPmpBjtIjfDC/gDXrNzJv0TIWLl3Bt99tpSS/0Fxb4nbhcrmim2UspQqFwqiHDtGqfVvG33cX11xxSfShiXFqiofDc3uqStGsvx+vsusju8RmfvE14x5/mrUr1iClpuJ2u6JLs60pfUfuaWh2TlNyu3agf+/u5HTuEO2PKA/2Y02JsHqC33z3Q0bcdCe+LBsA6LqBy+lg49LZnHXG6TGPRTnWlIidu/dE2imXsWzlWr7fsQu1JNJO6XGj+8vIbNiAMXeO5I5b/4zX447r2JHyijZtxkxWrd/Ikw/ea64lPQ6wLCv52pT3cMoSN15/bQKAafo8oXCYl/8zlSeffYVff/wJuV4qajBkdnK5HDRp0phO7dvQp2cOvbt3pW2rFr9tfFc1BIGYPptlfLbv2k27HoPMnWJ1HFCoUwBIokhZaSndu3dj8ecfYFRzlU55unTknKCworDpu+9ZtHQF8xbnsXbtevr37cXYe0bR9MzTo8oVd6qx8TvGTXiWT96ZxoDBlzFnxtSY5gKpqorD4eAfYx9n4sOPctl1Qxg7ZhSdLmgbd2omSxIIAj//up/HJr7ItI8+pXnzZvTp3pW+PXPodEFbMjPSj0lrqmskcpKkMb5OF2QIkb21fXt2i44Bqc5g2SOdZk3T0Q1zY6HT4aBDu9Z0aNeaO28dQWmpn5QUX4WwZk2V30qIOWSZfQfyeeLZl3nlv+8QCJQh1kvD5/VW+Xd6PG5Ebxqffv41s79ewM3Dr+Off7+D0xpmx8U5t7rdNE2jcaMGvDjxIcbdO4rsrPrHpDU1PSuLBvXp0Y2Vi5cjpqZQl8Ggut0UrxvgctI/0nQer+tQFIXofmFd19E0DUVR0TSNlBRfZKhtzacpm79bR5bNvzPpv2/Rqc/FPPPUy2gCpKano1dz0Kyu6+iaRr30NARJ4qUXJ9OpzyU898rrET9JjkZWahLKlCUzVKqqGtlZ9c0Rjwnc02D9iv69csEpmzrAKQgAQRAIhcOc1qQxndq3TVic3XLqrIdoPdSaTlNWIxZYliW+nLuA7gMG85e/juGXA/n4susjQlyaU8ovEd+fX8Bdd/+TnAsv57Mvv4luYa/pEnExMmTXmgyXyD0N1jPu2rE92ac1IqQodbsApS7j/1pZgM4XtCWtXmq0qKw2gBePsKZDlvlu63aGjLidiwYPY8Xqdfiy6uN0OKI8OZ5i+Qa+rPqs3bCZS6+5kcHXj2TDpi3RJeJqHJJbtXH+qqaRmZFOp3Zt0MoCdZpgrMMbANB1rrn84sie3viP4o6naJFwpCzLFBYV869HJtKt/2VM++ATc6l3ZDVRIj97dIm4z4unXgoffzKL7hdewT/GPsaB/AIckUGzmpZ8PQFWdExVNTTVDLde+YeBEIkinXIA0DQdyeth1w972LptZ9SJtEZx63EYxR2vMK0VMRFFkTfemU6nPpfw6CMTCWka3sz0GnPx6vkHOt6MdBRg4pMv0Kn3Jbzy+jsQoTCaptdpdMXgt3sa5MieBpfLyb4DBwkEAoheN5p+Cm6JNAwDh8vFuIcnMuHZVyKjuDvTr1d3unZqT+NGDSuEDFVViySEaqf2vmI8X2TBkjzGPvo0C+cvRvB48GVnmc50HSZytMhib192fX7at5/bbv87U9/7kPH33c3A/r0rRLpqg95Ew9GAQ5LMMpXIz0r9ftZ/+x0LluQxf8ly1n27mQMH83F73HVaE1SnYVDDMPBESnXXrNvImuWref7F/1C/YQM6tG1F357d6NW9Gx3atiI1NaX8GxO6ZdxKRomiyI7de3jkyeeZ+v4MdFXDWz8DQzeSpgndokVOpxPJ42bZijX8/sobGHLVpYy/fzTNzzsn6kMkuqap/FBjXdf5bus2s35r0TKWr1rHzj0/RsvdZY/bLIuu4yhQnW+K1yMNHR6fFzHVh2FAcUkJX89dwNdfzgW3i6ZnnkH3rh3J6dyBLp3a07lDu+MmlKr7WcAstSj1l/HcpP/y1IuTKdx/8PDYkSTtsrKyst7IGb4/7SM+/2oed4y8kb+PuoX0evWi5SSJODvDgO937GTt+o0sX72eBUvy+G7rdoKHSkAQENxu3G43ks97eMGJXve+npwUDw9zd5R1E8qyjDMtNVpP8sNPP7P7P2v56NPGPPnIP+nUvi26cPyygqoqkGUh35/xKQ9OeI4t327CkVYPX/3MyCbG5G8xtBxgb2YGQUXl0UefYtpHn/Gvf9zB8KFXI3J4eUfcDEekRmv9xu+4ffS/KNizHdKy8aak4KufgWEQneKtJpkBEZPVmhmGaVVKC4pwSRKj7vkHezbnccfNw82YfpyVXxQFVq5Zz++v/BPXDb+NLTt24svOMuPsJ+DMHU01HU9fdhY79vzIjf93J70HXcPivFWRqFv8rK/1LK694hJ2fLuYfz38EPVSUygrLIqWp+tJ2qSfdACwlkEHygKUFRVz8aALWfTlDJ6dMI7siCWON9hEUSS/oJiLrhnBnNlz8WVk4PF4Eh7WrC3/wO1246ufyaKFSxk4eBg//vxLNNIWz+emahrp9erx8L/+ztI5H3P1VZcRKC0l4PcnfIn4SQEAWZZRVRX/gYO0adGM6e+8xqzpb9L5grbR1Hy8HTmL9y9fvY6C/QdJyc6K/q2TRazF3qlZ9QkUF7N42Srz/8c5XyBFMu2KqtK65flMnzqJz2dMpUvH9vgP5qMoSkKWiJ/wALDS7v78AtJTfDz++FhWzPuUqy+/OLqMOlGpecsIzl+Sh6AqJ/WUNV3TEAzDXFEK5riGRNzgkfZSVdMYdGFflsz5iBeem0CjrPr4D+ZHn7kNgMiBlRUXowRD3HTTDaxaMIt77/4LHrc7WgOfyLi/2VdssGjpSgyno1YXcdQ6ACINQktWrDatcaTzLiGKJYrRuUmyJPHXkcNZvXAWd466BUHXKSssSgpKJNa18muqysAL+zH/82n854UnOOuMJtFl0Im2ElZh3J4ff+LbLVtxJNHmkkR9X6fLxbYdu9iybWfcneGj3e4GZkKuYXYWz00Yz9KvPubKKy8xb6Q6BkGdAkAURRR/Gf83Yig9c7oQCoWiW9Br42AsJ3DpyjX48wtw1vHS5trxsySUQyUszlsZAUUtzDLFbH01t0uG6NCuNXfffjNqMHRqA8AwDCSXizEPPEZR8SEcDkft3kCRf89duBT0xHDi5IsMAaJofmeIazg51kBHKBzmznsfxEiCI69TAOi6jtvnZfeW73nu1Tei9fpVfqhUr/ZekiQURWHpijUIHtdJzf8r0D6PmxVrNlDq9yPJUrW22FfnptQitPaNdz9k3fJVeOqloNVxtK3OnWBN03Cmp/H0C5PZvWdvtIurKodqTYqoynVqZUO/27aD7Tt24XS5TonR4oZh4HK62LtnL+u+3VwtGmTVSVXF6BiREoz8gkIefuJ5HKkptba1MqkBYBgGDqeTQ/kFPPD4MzE7ZuXLlAVB4MXJU1i0bGVkE6Ee0/sBFi9biVJSWukolpNVREnACAZZsGRF5BnoMRuMVeu+5d/Pv4YaKRiMtRTcCjg8/uwr/LxrN063Oyn8raTIA6iqiicjnXffm8GiZSuRZfmo1sUq+pIkEVmWWbBkOb0GXsWd9zzIWWc0qVIECmDeojwQRU6lcfqGYYDDwfwleRFAiDGf17lNz2T8E8/Src8f+Pyr+dG2zGPRIiuit3nrNl5+7U1cGelJU1eVNJlgQTALpsaMn3DUYq1oO6JDZsfuPQy/dTQXXj6UxXPn079vD848vbE5LjyGuUKyLFFS6mf56vXmrKBE0Z9qjg9J5OpVXTeQPW7WbtjM/gP5SOLx/YDyrYyDBvRlzdIVXHLtCK4dfhubtmyL0qLK2jKNyPvvfehJAiWlCc0/nLAA0DQdT1oqeQuX8tYHH0etimVBrHbEklI/D//7ebr2vZSpU9/H4/Uiut306NrJfG0MlsVS9nXfbmbvj3txuVwJeSCCIIBhUOovq/J7y8oCGJpujo5JwA3gdDrJ/3Ufy9esq3Amx3xf5DU9czojetyk1ktl+oef0q3/Zdwz9nEKCot+05Zp0dTZXy9g5qdf4MlIr3Hv8kkJAOuAZa+XcY8/S3GJWUeuRBo5RFHk/Rkz6drvUsY+8BglgYBZpqxpGA4H/XrlVLiqj0sBMNcLGcFgwqZRWAAeevVlVXifOXz2d326I/u8KMFwgj4foGnMX5QXOZPYbiWAPt27IXo8KIqCLzMdRdd58snn6NTnEiZPeS/almkpelhRuPehJxElmWTjmkkFAF03cHk9/LB1G/9+/jVkScLpcLB89ToGXHE91w27lS07dkfLlDVNIxQK0bhJYzq2a1PhIR3bCTQd3vlLloPDEXfrb4LQIHiohFdfnsiIoVeb9UwxfDZJEtEjNTTvvzUJTQmjRUpC4n3WuJwsyltpcvQYggCiKGJg0LrF+Zx7TlNCwWDUufVlZ7Hn518Zeetoel90Nd8sXBrt8X7tzfdYv2IN7iTZCZC0ALCuTEdaPV6YPIWFS1cw6r4H6TlwMF/PXYg3Ix2Pxx0tUxZFET0YpEvHttRLTUGNIbVuheP2H8hn7bebkePM/y3aEzxUyqsvTWTksCEoilIlBRZFEUVRueoPF/H+lEnoioIeZxAYhoHT7WbTlm3s3rMXMcbomaZqOJ0Ocrt2wAiGTFBEyq5dLie+rEyW5K3kd5dex/C//J3FeauY8NwkpBRvTPT0lAeAYRiIkkQwGKL/Fdfz/AuTkZxOvGn1ImP69IrKpun07ZlbgaPGwv+Xr1lHwb59OON4A0Qtf0kpr748kZHDh1S7BFiWJcKKwlWXmiDQFCWuN4FhGDhkmbKCQpasWG2eTQznYL2kX+TMj7xVzLbMFNw+L1Onvk/fS6/jwMECZKczKctMknPlSaRDyyFLeNPTIvPptUqtkezz0Tu3S8z0x3oG3yxcCooWNyfzMO2JKP+wITWuf3fIMko5EOhxBoElcxeYZRGxnIQ1Ua9Ht054MtJRFLXSgIZhGHjT03A4ZPM9dkdYlTGAYVhp90o+uCAQCgU599ymtGrRLObJ0tYcz8V5q8DtjEv5w9FoTzyaP+RKQBAvOqQbBoLbRd6qtYTC4Uj1rXF8P8AwOPusM2jdohnhYwQRrNxAMudYToylV5U6siJGIERulw64nM7ocofj0R9BENi150c2b9mG011z/h9P2nMsECSCDum6jsvlZseO3Wzeuj2SRT++tqqRfuNeuV0gGK7RnFUbANW+IsxPP6BvTzRNj/YQHItnWg936fI1lBUW4XDI8VH+ONKe2qZDkiyilvpZtHRFBR/pWLeGpmuoqka/XrngkJNivMkpBQArK+muV482Lc5HkkQ8bnc0X2C14x35MK0L4ptFy5Ka9tQmHTIMQBaZF2mTFI74XdYuAmsynySKuCMrp7p1bE9GgyyUWhpsnBBdSqZN8VX+8ECDrPp0bN+Gvj1z6JXThdYtm+FyuSo8QCshI0XCi+16DWLb9p24Pe5q+QC1afkrE0VVcToczJg5myHDb0N0OJAihWnV+S6KEqZhgwZsXjaHetGleVS6fmrvT7+wYvU65i3OY+mKNWzZtqPOS5pPWQCAmWU0giHQNOQUH+edfRY5XTrQr2cuOV06cH5kNKAlazdsomv/y5GcjmpFJupa+Q/zcHNcejxAIIoiwVI/c2dNo1/PnAo/KygsYu2GTcxfnGcuINy8lcIDB0HTwOXC6XYjnMCNRDInuLicTsTIQ1A1nS3bd7Fl43e8+ca7+DLSaXn+efTM6Uyv7l3plduFBUtXoJb6cWVnVnlKWZT2lNQe7YmVDg0ZfhsCIFYDBKIoYoRCLFq6gp7dOrF63bcsXb6a+UuWs3r9Rn7+6ZfoPmDZ446GpnXdOOF7KE74G+C3D/OIZc7BEIRCIIo0PKMJgiBQkF+AWMX+32Sx/ImgQ4IgoCkKDRs1IDUlhS1bt2MEAtGtmq7IEnJDNye8nUx90ycdAI50egXBXIdkGBAKhUGI7Bk+CZQ/rnRIEFAVBU3TzCG2khjdq3wyDwo4qQFQuSJTdctfnvYMH5KUE86OBIHkcFSZDlnDiE+F1tAoY+AUEqOK13dtJLni6RPUNFlmLbg4leSUAkBVbwtd02pMe6qrVNWhHpUly9Q63sJoA+BEPhxdZ9ILT9ZI+cVqLuK2knpVBUH56NC7b76MjEnhbBDYAKiS8gWLixlx41BuHTGUYDBUZeXXI0oXDIV4/Z3pMSuyrpvv+3zOPA4WFFZrVpIsywSDIa65bBATJ4wjeKikTleR2gA4wUTXdVypqbz3/kdM/9/nuN2uKu0lsDamIAhcfcOtvP72B2aJRkz9CmZuYtZX8/jD1cMIhcJVBoEZyXGxbeduXvnPVBxezynH7W0A1NBZFkSR0mCQoSNuZ8bM2TgiC7BjVX5BELjhlruZNf0DGjXIrvJnaJBVn+XzvmbwsFsIhkIxg8Ba8Lfzhx+56Mob+HbDpqRtRrEBkOQgcDidiA4HQ4bfFgWBcgwQlFf+oTeP4p23piGmZR/zPUcTRVURU7L4fNZXXDF0JMFQOLqA4miillP+AZcNZefuH/BlpNvW3wZA9amQJMtI5UDgPMpNcKTyv//WNNIaZqPXYKWTriikN8hizhdzuGLozQSOQYc0TcMhy+z8Yc9h5a9X74Tcb2YDIMlAIMryb26C8opVmfL7GmZX2i5Y5ZtAUUnJzmbOF19xxfU3V0qHtAqW/3pb+W0AJOYmqAwERiXKn9IwG1WJn/IpikJKdn3mfP5bOqRVRnts5bcBUBt0yOFwRNssyyu/osRf+cyboP5hOhQORzdq2spvA6D26dCw2/josy+RZZkhN90RV9oTCx26fMhNAPzw408MuPQ6W/mrKbJ9BNW7CXRN4893jOHFyVOYN3ch3uysuNKeY9EhX1Z9vpo9l0HXjuCXffvZuXMXvowMW/ltANQeCGSXk0AgyLz5S/Cmp9XquG9VVfHWz2TOV/NBlvCkp9vKbwOgdsXQzTofb4ovJuW3KlGPl5CKtWJV0zS8KT4MSMqRgzYATgUQGAZajBlWIbIn4Hg1OdZegFiK1zQ7wWUD4EQBiqqq5qiW4wDA6lPWbKteK3JKdYTVDVXS8fq8NMzOqtL7CouKKSoqRkyibSo2AGypttOsKEqsjwQwkGTZXNxnPx2bAp3oIokisscT650BCFVu37TFBkDy0iBi211Q8R221IbYmWBbbADYYosNAFtssQFgiy02AGyxxQaALbbYALDFFhsAtthiA8AWW2wA2GKLDQBbbLEBYIstNgBsscUGgC222ACwxRYbALbYYgPAFltsANhiiw0AW2yxAWCLLTYAbLHFBoAtttgAsMWWJJP/Bw2GUCRl4ETJAAAAAElFTkSuQmCC";
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 48;
const NAVY = rgb(0.025, 0.094, 0.145);
const PURPLE = rgb(0.36, 0.12, 0.62);
const PALE = rgb(0.95, 0.97, 0.99);
const MID = rgb(0.38, 0.45, 0.56);
const LINE = rgb(0.82, 0.86, 0.91);
const WHITE = rgb(1, 1, 1);
const BLACK = rgb(0.04, 0.09, 0.16);

export type InvoiceDocument = {
  invoice_reference: string;
  invoice_type: string;
  issue_date: string | null;
  due_date: string | null;
  purchase_order_reference: string | null;
  payment_link: string | null;
  notes: string | null;
  net_total: number | string;
  vat_total: number | string;
  gross_total: number | string;
  issuer_name_snapshot: string | null;
  issuer_address_snapshot: string | null;
  issuer_legal_details_snapshot: string | null;
  payment_instructions_snapshot: string | null;
  invoice_footer_snapshot: string | null;
  recipient_name_snapshot: string | null;
  recipient_email_snapshot: string | null;
  recipient_address_snapshot: string | null;
  event_name_snapshot: string | null;
  event_start_date_snapshot: string | null;
  event_end_date_snapshot: string | null;
  approved_at: string | null;
  issued_at: string | null;
};

export type InvoiceLine = {
  attendee_id?: string | null;
  attendee_name_snapshot?: string | null;
  description: string;
  quantity: number | string;
  unit_price: number | string;
  net_amount: number | string;
  vat_rate: number | string | null;
  vat_amount: number | string;
  gross_amount: number | string;
};

const printable = (value: unknown) => String(value ?? "")
  .replace(/[\u2010-\u2015\u2212]/g, "-")
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/[\u201c\u201d]/g, '"')
  .replace(/[^\x09\x0a\x0d\x20-\x7e\xA0-\xFF]/g, "");

const number = (value: number | string | null | undefined) => Number(value || 0);
const money = (value: number | string | null | undefined) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(number(value));
const date = (value: string | null | undefined) => {
  if (!value) return "Not set";
  const parsed = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
  return Number.isNaN(parsed.getTime()) ? printable(value) : parsed.toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  });
};

function base64Bytes(value: string) {
  const raw = atob(value);
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
  return bytes;
}

function wrapText(value: unknown, font: PDFFont, size: number, maxWidth: number) {
  const output: string[] = [];
  const paragraphs = printable(value).split(/\r?\n/);
  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
      output.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (!line || font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate;
      } else {
        output.push(line);
        line = word;
      }
    }
    if (line) output.push(line);
  }
  return output;
}

function drawTextLines(page: PDFPage, lines: string[], options: {
  x: number; y: number; width: number; font: PDFFont; size?: number; colour?: ReturnType<typeof rgb>; lineHeight?: number;
}) {
  const size = options.size ?? 10;
  const lineHeight = options.lineHeight ?? size * 1.35;
  let y = options.y;
  for (const line of lines) {
    page.drawText(line, { x: options.x, y, font: options.font, size, color: options.colour ?? BLACK });
    y -= lineHeight;
  }
  return y;
}

export async function createInvoicePdf(invoice: InvoiceDocument, lines: InvoiceLine[]) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Invoice ${printable(invoice.invoice_reference)}`);
  pdf.setAuthor(printable(invoice.issuer_name_snapshot || "UKAF WSA"));
  pdf.setSubject(printable(invoice.event_name_snapshot || "ISSSC invoice"));
  pdf.setCreator("UKAF WSA ISSSC Finance");
  pdf.setProducer("UKAF WSA ISSSC Finance");
  const documentDate = new Date(invoice.issued_at || invoice.approved_at || "2027-01-01T00:00:00Z");
  if (!Number.isNaN(documentDate.getTime())) {
    pdf.setCreationDate(documentDate);
    pdf.setModificationDate(documentDate);
  }

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await pdf.embedPng(base64Bytes(LOGO_PNG_BASE64));
  let page: PDFPage;
  let y = 0;

  const addPage = () => {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 92, width: PAGE_WIDTH, height: 92, color: NAVY });
    page.drawImage(logo, { x: MARGIN, y: PAGE_HEIGHT - 76, width: 52, height: 52 });
    page.drawText("UKAF WSA", { x: 114, y: PAGE_HEIGHT - 48, font: bold, size: 18, color: WHITE });
    page.drawText(printable(invoice.event_name_snapshot || "Inter Service Snow Sports Championships").slice(0,70), { x: 114, y: PAGE_HEIGHT - 67, font: regular, size: 9.5, color: WHITE });
    y = PAGE_HEIGHT - 125;
  };

  const ensure = (height: number) => {
    if (y - height < 56) addPage();
  };

  addPage();
  page.drawText("INVOICE", { x: MARGIN, y, font: bold, size: 28, color: NAVY });
  page.drawText(printable(invoice.invoice_reference), {
    x: PAGE_WIDTH - MARGIN - bold.widthOfTextAtSize(printable(invoice.invoice_reference), 14),
    y: y + 5, font: bold, size: 14, color: PURPLE,
  });
  if (invoice.invoice_type === "consolidated_company") {
    const companyHeading = wrapText(`Billed to ${printable(invoice.recipient_name_snapshot || "Company")}`, bold, 11, PAGE_WIDTH - MARGIN * 2);
    drawTextLines(page, companyHeading, {x: MARGIN, y: y - 23, width: PAGE_WIDTH - MARGIN * 2, font: bold, size: 11, lineHeight: 13, colour: NAVY});
    y -= 39 + companyHeading.length * 13;
  } else y -= 36;

  const meta = [
    ["Issue date", date(invoice.issue_date)],
    ["Due date", date(invoice.due_date)],
    ["Purchase order", printable(invoice.purchase_order_reference || "Not supplied")],
  ];
  page.drawRectangle({ x: MARGIN, y: y - 46, width: PAGE_WIDTH - MARGIN * 2, height: 52, color: PALE });
  const metaWidth = (PAGE_WIDTH - MARGIN * 2) / meta.length;
  meta.forEach(([label, value], index) => {
    const x = MARGIN + index * metaWidth + 12;
    page.drawText(label, { x, y: y - 10, font: regular, size: 8.5, color: MID });
    page.drawText(value, { x, y: y - 29, font: bold, size: 10.5, color: BLACK });
  });
  y -= 76;

  const columnWidth = (PAGE_WIDTH - MARGIN * 2 - 26) / 2;
  const fromLines = [
    printable(invoice.issuer_name_snapshot || "UKAF WSA"),
    ...printable(invoice.issuer_address_snapshot).split(/\r?\n/),
    ...printable(invoice.issuer_legal_details_snapshot).split(/\r?\n/),
  ].filter(Boolean);
  const toLines = [
    printable(invoice.recipient_name_snapshot || "Invoice recipient"),
    ...printable(invoice.recipient_address_snapshot).split(/\r?\n/),
    printable(invoice.recipient_email_snapshot),
  ].filter(Boolean);
  const fromWrapped = fromLines.flatMap((line) => wrapText(line, regular, 9.5, columnWidth - 20));
  const toWrapped = toLines.flatMap((line) => wrapText(line, regular, 9.5, columnWidth - 20));
  const addressHeight = Math.max(fromWrapped.length, toWrapped.length, 3) * 12 + 32;
  page.drawRectangle({ x: MARGIN, y: y - addressHeight, width: columnWidth, height: addressHeight, borderColor: LINE, borderWidth: 1 });
  page.drawRectangle({ x: MARGIN + columnWidth + 26, y: y - addressHeight, width: columnWidth, height: addressHeight, borderColor: LINE, borderWidth: 1 });
  page.drawText("FROM", { x: MARGIN + 12, y: y - 18, font: bold, size: 8, color: PURPLE });
  page.drawText("BILL TO", { x: MARGIN + columnWidth + 38, y: y - 18, font: bold, size: 8, color: PURPLE });
  drawTextLines(page, fromWrapped, { x: MARGIN + 12, y: y - 32, width: columnWidth - 20, font: regular, size: 9.5, lineHeight: 12 });
  drawTextLines(page, toWrapped, { x: MARGIN + columnWidth + 38, y: y - 32, width: columnWidth - 20, font: regular, size: 9.5, lineHeight: 12 });
  y -= addressHeight + 20;

  const eventName = printable(invoice.event_name_snapshot || "Inter Service Snow Sports Championships 2027");
  const eventDates = `${date(invoice.event_start_date_snapshot)} to ${date(invoice.event_end_date_snapshot)}`;
  page.drawText(eventName, { x: MARGIN, y, font: bold, size: 12, color: NAVY });
  page.drawText(eventDates, { x: MARGIN, y: y - 16, font: regular, size: 9, color: MID });
  y -= 40;

  const columns = {
    description: { x: MARGIN, width: 226 },
    quantity: { x: 282, width: 44 },
    unit: { x: 334, width: 70 },
    vat: { x: 412, width: 44 },
    gross: { x: 464, width: 83 },
  };
  const drawTableHeader = () => {
    page.drawRectangle({ x: MARGIN, y: y - 22, width: PAGE_WIDTH - MARGIN * 2, height: 26, color: NAVY });
    [["Description", columns.description.x], ["Qty", columns.quantity.x], ["Unit", columns.unit.x], ["VAT", columns.vat.x], ["Gross", columns.gross.x]].forEach(([label, x]) => {
      page.drawText(String(label), { x: Number(x) + 6, y: y - 13, font: bold, size: 8.5, color: WHITE });
    });
    y -= 26;
  };
  drawTableHeader();

  const groups = new Map<string, {name: string; lines: InvoiceLine[]}>();
  for (const line of lines) {
    const key = invoice.invoice_type === "consolidated_company" ? (line.attendee_id || "adjustments") : "individual";
    if (!groups.has(key)) groups.set(key, {name: line.attendee_name_snapshot || (line.attendee_id ? "Attendee (see item descriptions)" : "Company adjustments"), lines: []});
    groups.get(key)!.lines.push(line);
  }
  for (const group of groups.values()) {
    const company = invoice.invoice_type === "consolidated_company";
    const groupHeading = (continued = false) => {
      const heading = wrapText(group.name + (continued ? " (continued)" : ""), bold, 10, PAGE_WIDTH - MARGIN * 2 - 12);
      if (y - heading.length * 13 - 15 - 42 < 120) {addPage();drawTableHeader();}
      drawTextLines(page, heading, {x:MARGIN+6, y:y-16, width:PAGE_WIDTH-MARGIN*2-12, font:bold, size:10, lineHeight:13});
      y -= heading.length * 13 + 15;
    };
    if (company) groupHeading();
    group.lines.forEach((line, index) => {
    const descriptionLines = wrapText(line.description, regular, 9, columns.description.width - 12);
    const rowHeight = Math.max(30, descriptionLines.length * 12 + 12);
    if (y - rowHeight < 120) {
      addPage();
      drawTableHeader();
      if (company) groupHeading(true);
    }
    if (index % 2 === 1) page.drawRectangle({ x: MARGIN, y: y - rowHeight, width: PAGE_WIDTH - MARGIN * 2, height: rowHeight, color: PALE });
    drawTextLines(page, descriptionLines, { x: columns.description.x + 6, y: y - 17, width: columns.description.width - 12, font: regular, size: 9, lineHeight: 12 });
    const values = [
      [number(line.quantity).toLocaleString("en-GB", { maximumFractionDigits: 2 }), columns.quantity],
      [money(line.unit_price), columns.unit],
      [money(line.vat_amount), columns.vat],
      [money(line.gross_amount), columns.gross],
    ] as const;
    values.forEach(([value, column]) => {
      const x = column.x + column.width - regular.widthOfTextAtSize(value, 8.5) - 6;
      page.drawText(value, { x, y: y - 17, font: regular, size: 8.5, color: BLACK });
    });
    page.drawLine({ start: { x: MARGIN, y: y - rowHeight }, end: { x: PAGE_WIDTH - MARGIN, y: y - rowHeight }, thickness: 0.6, color: LINE });
    y -= rowHeight;
    });
    if (company) {
      ensure(42);
      const subtotal = group.lines.reduce((sum, line) => sum + Math.round(number(line.gross_amount) * 100), 0) / 100;
      page.drawText("Attendee subtotal", {x:MARGIN+6,y:y-18,font:bold,size:9,color:NAVY});
      const value = money(subtotal);
      page.drawText(value,{x:PAGE_WIDTH-MARGIN-6-bold.widthOfTextAtSize(value,9),y:y-18,font:bold,size:9,color:NAVY});
      y -= 36;
    }
  }

  ensure(92);
  y -= 16;
  const totalX = 360;
  [["Net total", money(invoice.net_total)], ["VAT", money(invoice.vat_total)], ["TOTAL DUE", money(invoice.gross_total)]].forEach(([label, value], index) => {
    const baseline = y - index * 24;
    if (index === 2) page.drawRectangle({ x: totalX - 10, y: baseline - 9, width: PAGE_WIDTH - MARGIN - totalX + 10, height: 25, color: PURPLE });
    page.drawText(label, { x: totalX, y: baseline, font: index === 2 ? bold : regular, size: index === 2 ? 10.5 : 9.5, color: index === 2 ? WHITE : MID });
    page.drawText(value, { x: PAGE_WIDTH - MARGIN - 8 - (index === 2 ? bold : regular).widthOfTextAtSize(value, index === 2 ? 11 : 9.5), y: baseline, font: index === 2 ? bold : regular, size: index === 2 ? 11 : 9.5, color: index === 2 ? WHITE : BLACK });
  });
  y -= 92;

  const information = [
    ["Payment instructions", invoice.payment_instructions_snapshot],
    ["Payment link", invoice.payment_link],
    ["Invoice notes", invoice.notes],
  ].filter(([, value]) => printable(value).trim());
  for (const [label, value] of information) {
    const wrapped = wrapText(value, regular, 9.5, PAGE_WIDTH - MARGIN * 2 - 24);
    const height = wrapped.length * 13 + 38;
    ensure(height + 12);
    page.drawRectangle({ x: MARGIN, y: y - height, width: PAGE_WIDTH - MARGIN * 2, height, color: PALE });
    page.drawText(String(label).toUpperCase(), { x: MARGIN + 12, y: y - 18, font: bold, size: 8, color: PURPLE });
    drawTextLines(page, wrapped, { x: MARGIN + 12, y: y - 36, width: PAGE_WIDTH - MARGIN * 2 - 24, font: regular, size: 9.5, lineHeight: 13 });
    y -= height + 8;
  }

  const footer = printable(invoice.invoice_footer_snapshot);
  const pages = pdf.getPages();
  pages.forEach((pdfPage, index) => {
    const label = `Page ${index + 1} of ${pages.length}`;
    if (footer && index === pages.length - 1) {
      const footerLines = wrapText(footer, regular, 7.5, PAGE_WIDTH - MARGIN * 2).slice(0, 2);
      drawTextLines(pdfPage, footerLines, { x: MARGIN, y: 49, width: PAGE_WIDTH - MARGIN * 2, font: regular, size: 7.5, colour: MID, lineHeight: 9 });
    }
    pdfPage.drawText("UKAF WSA - ISSSC Finance", { x: MARGIN, y: 23, font: regular, size: 8, color: MID });
    pdfPage.drawText(label, { x: PAGE_WIDTH - MARGIN - regular.widthOfTextAtSize(label, 8), y: 23, font: regular, size: 8, color: MID });
  });

  return pdf.save({ useObjectStreams: false });
}
